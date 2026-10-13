<?php

namespace App\Services;

use App\Models\AccountDeletion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * A subscriber deleting their own account (their right under the Data Privacy Act).
 *
 * What goes: the login, the mobile number, the email, the equipment (MAC) address, and the
 * password. What stays: the billing record (name, address, plan, installation date, service
 * status and every payment), archived, because those are the company's financial records and
 * their integrity depends on them. They are kept for the retention period in the Privacy Policy.
 * Anything still owed stays owed.
 */
class AccountDeletionService
{
    public function __construct(private PhilSmsService $sms) {}

    public function delete(User $user, ?string $reason, ?string $detail): void
    {
        $subscriber = $user->subscriber;
        $number = $user->contact_number;
        $name = $subscriber?->name ?? $user->name;

        DB::transaction(function () use ($user, $subscriber, $name, $reason, $detail) {
            AccountDeletion::create([
                'subscriber_id' => $subscriber?->subscriber_id,
                'subscriber_name' => $name,
                'reason' => $reason,
                'detail' => $detail,
            ]);

            // Written first, so the audit trail keeps who did it even after the login is gone.
            Audit::log('account.deleted_by_owner', $subscriber, $name, ['reason' => $reason], $user);

            // Pending verification and reset codes go with the login (they are tied to it).
            $user->tokens()->delete();

            if ($subscriber) {
                $subscriber->forceFill([
                    'contact_number' => null,
                    'email' => null,
                    'mac_address' => null,
                    'password' => null,
                ])->save();
                $subscriber->delete(); // archived: out of the lists, nobody can sign in
            }

            $user->delete();
        });

        // Best effort, after the fact. The number is no longer on file, so it is kept from before.
        if ($number) {
            $this->sms->send(PhilSmsService::normalizeNumber($number),
                'Your SWIFT account was deleted at your request. If this was not you, contact the office right away. - Jubal Brothers Cable TV Corp - Palayan Branch');
        }
    }
}
