<?php

namespace App\Services;

use App\Models\PhoneVerification;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * Proves a user controls the mobile number on their account by texting a 6-digit code.
 * Codes are stored hashed, expire after 10 minutes, allow 5 wrong tries, and can be
 * re-sent at most once a minute.
 */
class PhoneVerificationService
{
    public const CODE_MINUTES = 10;
    public const MAX_ATTEMPTS = 5;
    public const RESEND_SECONDS = 60;

    public function __construct(private PhilSmsService $sms) {}

    /** @return array{ok: bool, message: string, status: int} */
    public function send(User $user): array
    {
        if (! $user->contact_number) {
            return $this->fail('Your account has no mobile number to verify.', 422);
        }

        if ($user->contact_verified_at) {
            return $this->fail('Your number is already verified.', 422);
        }

        $existing = PhoneVerification::where('user_id', $user->id)->first();
        if ($existing && $existing->created_at->gt(now()->subSeconds(self::RESEND_SECONDS))) {
            return $this->fail('A code was just sent. Please wait a minute before asking for another.', 429);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $record = PhoneVerification::updateOrCreate(
            ['user_id' => $user->id],
            [
                'phone' => $user->contact_number,
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes(self::CODE_MINUTES),
                'attempts' => 0,
                'created_at' => now(),
            ],
        );

        $result = $this->sms->send(PhilSmsService::normalizeNumber($user->contact_number), sprintf(
            'Your SWIFT verification code is %s. It expires in %d minutes. Do not share it with anyone. - Jubal Brothers Cable TV Corp - Palayan Branch',
            $code,
            self::CODE_MINUTES,
        ));

        if (! $result['success']) {
            $record->delete();

            return $this->fail('We could not send the text message right now. Please try again later.', 503);
        }

        return ['ok' => true, 'message' => 'We sent a 6-digit code to your mobile number.', 'status' => 200];
    }

    /** @return array{ok: bool, message: string, status: int} */
    public function confirm(User $user, string $code): array
    {
        $record = PhoneVerification::where('user_id', $user->id)->first();

        // A code only counts for the number it was sent to (the number may have been changed since).
        if (! $record || $record->phone !== $user->contact_number) {
            return $this->fail('Request a new code first.', 422);
        }

        if ($record->expires_at->isPast()) {
            $record->delete();

            return $this->fail('That code has expired. Request a new one.', 422);
        }

        if ($record->attempts >= self::MAX_ATTEMPTS) {
            $record->delete();

            return $this->fail('Too many wrong tries. Request a new code.', 422);
        }

        if (! Hash::check($code, $record->code_hash)) {
            $record->increment('attempts');

            return $this->fail('That code is not correct.', 422);
        }

        $record->delete();
        $user->forceFill(['contact_verified_at' => now()])->save();
        Audit::log('phone.verified', $user, null, [], $user);

        return ['ok' => true, 'message' => 'Your mobile number is verified.', 'status' => 200];
    }

    private function fail(string $message, int $status): array
    {
        return ['ok' => false, 'message' => $message, 'status' => $status];
    }
}
