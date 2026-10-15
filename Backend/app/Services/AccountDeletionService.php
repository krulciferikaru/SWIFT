<?php

namespace App\Services;

use App\Models\AccountDeletion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * A subscriber deleting their own account (their right under the Data Privacy Act).
 *
 * What goes: the login (the user account), and with it the ability to sign in. What stays: the
 * subscriber's record, exactly as it was (name, address, mobile number, plan, installation date,
 * service status and every payment), because it is the company's own record and the integrity of
 * its books depends on it. The record gets a note that the person deleted their account, so staff
 * can see that this subscriber is no longer using SWIFT. Anything still owed stays owed.
 *
 * No more text messages are sent to someone who deleted their account (see PhilSmsService).
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

            // The subscriber's record is left alone. Only the login is deleted. (Deleting a user normally
            // archives their subscriber record too, so that model event is skipped here.)
            User::withoutEvents(fn () => $user->delete());
        });

        // Best effort, after the fact: the one text they get, so they know it was done (and can say if it was not them).
        if ($number) {
            $this->sms->send(PhilSmsService::normalizeNumber($number),
                'Your SWIFT account was deleted at your request. If this was not you, contact the office right away. - Jubal Brothers Cable TV Corp - Palayan Branch');
        }
    }
}
