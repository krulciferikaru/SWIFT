<?php

namespace App\Services;

use App\Models\PasswordResetCode;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

/**
 * "Forgot password" by text message. Only an active account whose mobile number has been
 * verified can use it, so a code can only ever go to a number the person proved they own.
 *
 * Nothing here says whether a number belongs to an account: asking for a code always looks the
 * same from outside, and so does a failed reset. A code lasts 10 minutes, allows 5 wrong tries,
 * can be asked for at most once a minute, and a successful reset signs the person out everywhere.
 */
class PasswordResetService
{
    public const CODE_MINUTES = 10;
    public const MAX_ATTEMPTS = 5;
    public const RESEND_SECONDS = 60;
    public const FAILURE_MESSAGE = 'That code is not correct or has expired. Request a new one.';

    public function __construct(private PhilSmsService $sms) {}

    /** Sends a code if (and only if) the number belongs to an eligible account. Always returns quietly. */
    public function request(string $identifier): void
    {
        $digits = $this->normalize($identifier);
        if ($digits === '') {
            return;
        }

        // Each text costs money and could be pointed at someone else's number, so cap it per number.
        $sendKey = 'pwreset-send:'.$digits;
        if (RateLimiter::tooManyAttempts($sendKey, 3)) {
            return;
        }
        RateLimiter::hit($sendKey, 600);

        $user = $this->findEligibleUser($digits);
        if (! $user) {
            return;
        }

        $existing = PasswordResetCode::where('user_id', $user->id)->first();
        if ($existing && $existing->created_at->gt(now()->subSeconds(self::RESEND_SECONDS))) {
            return;
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $record = PasswordResetCode::updateOrCreate(
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
            'Your SWIFT password reset code is %s. It expires in %d minutes. If you did not ask for it, ignore this message and do not share the code. - Jubal Brothers Cable TV Corp - Palayan Branch',
            $code,
            self::CODE_MINUTES,
        ));

        if (! $result['success']) {
            $record->delete();

            return;
        }

        Audit::log('auth.password_reset_requested', $user, null, [], $user);
    }

    /** @return array{ok: bool, message: string} */
    public function reset(string $identifier, string $code, string $newPassword): array
    {
        $digits = $this->normalize($identifier);
        $tryKey = 'pwreset-try:'.$digits;

        if ($digits === '' || RateLimiter::tooManyAttempts($tryKey, 10)) {
            return $this->fail();
        }
        RateLimiter::hit($tryKey, 900);

        $user = $this->findEligibleUser($digits);
        $record = $user ? PasswordResetCode::where('user_id', $user->id)->first() : null;

        if (! $user || ! $record || $record->phone !== $user->contact_number) {
            return $this->fail();
        }

        if ($record->expires_at->isPast() || $record->attempts >= self::MAX_ATTEMPTS) {
            $record->delete();

            return $this->fail();
        }

        if (! Hash::check($code, $record->code_hash)) {
            $record->increment('attempts');

            return $this->fail();
        }

        DB::transaction(function () use ($user, $record, $newPassword) {
            // The model hashes the password when it is saved.
            $user->forceFill(['password' => $newPassword])->save();
            $user->tokens()->delete(); // signed out everywhere, including whoever knew the old password
            $record->delete();
        });

        // The person may have been locked out by the wrong guesses that led them here.
        foreach (array_filter([$user->contact_number, $user->email]) as $name) {
            RateLimiter::clear('login-failures:'.mb_strtolower($name));
        }
        RateLimiter::clear($tryKey);

        Audit::log('auth.password_reset', $user, null, [], $user);
        $this->sms->send(PhilSmsService::normalizeNumber($user->contact_number),
            'Your SWIFT password was just changed. If this was not you, contact the office right away. - Jubal Brothers Cable TV Corp - Palayan Branch');

        return ['ok' => true, 'message' => 'Your password has been changed. Sign in with your new password.'];
    }

    private function findEligibleUser(string $digits): ?User
    {
        return User::query()
            ->whereRaw("REPLACE(REPLACE(REPLACE(contact_number, '-', ''), ' ', ''), '+', '') IN (?, ?)", [$digits, $this->international($digits)])
            ->where('account_status', 'active')
            ->whereNotNull('contact_verified_at')
            ->get()
            // An archived subscriber's login stays suspended, so it cannot be recovered this way either.
            ->first(fn (User $u) => ! $u->subscriber_id || $u->subscriber);
    }

    /** "+63 917 123 4567", "63917...", "0917-123-4567" all become 09171234567. */
    private function normalize(string $input): string
    {
        $digits = preg_replace('/\D/', '', $input);
        if (str_starts_with($digits, '63') && strlen($digits) === 12) {
            $digits = '0'.substr($digits, 2);
        }

        return $digits;
    }

    private function international(string $digits): string
    {
        return str_starts_with($digits, '0') ? '63'.substr($digits, 1) : $digits;
    }

    private function fail(): array
    {
        return ['ok' => false, 'message' => self::FAILURE_MESSAGE];
    }
}
