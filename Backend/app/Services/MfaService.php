<?php

namespace App\Services;

use App\Models\User;
use App\Support\Totp;
use Illuminate\Support\Facades\Hash;

/**
 * The authenticator-app second step for administrators: setting it up, checking a code, and the
 * single-use recovery codes that get an administrator back in if the phone is lost.
 */
class MfaService
{
    /** Starts (or restarts) setup: a fresh secret that does nothing until a code from the app proves it works. */
    public function beginSetup(User $user): array
    {
        $secret = Totp::generateSecret();
        $user->forceFill(['mfa_secret' => $secret, 'mfa_enabled_at' => null, 'mfa_recovery_codes' => null, 'mfa_last_step' => null])->save();

        return [
            'secret' => $secret,
            'uri' => Totp::uri($user->email ?? $user->name, config('mfa.issuer'), $secret),
        ];
    }

    /**
     * Turns it on once the person types a correct code from their app.
     *
     * @return list<string>|null the recovery codes (shown once), or null when the code was wrong
     */
    public function enable(User $user, string $code): ?array
    {
        if (! $user->mfa_secret || $user->mfa_enabled_at) {
            return null;
        }

        $step = Totp::verify($user->mfa_secret, $code);
        if ($step === null) {
            return null;
        }

        $codes = $this->newRecoveryCodes($user, save: false);
        $user->forceFill(['mfa_enabled_at' => now(), 'mfa_last_step' => $step])->save();

        return $codes;
    }

    /**
     * Checks what was typed at sign-in: a code from the app, or one of the recovery codes.
     *
     * @return 'totp'|'recovery'|null which one it was, or null when it was wrong
     */
    public function check(User $user, string $input): ?string
    {
        if (! $user->mfa_secret || ! $user->mfa_enabled_at) {
            return null;
        }

        $step = Totp::verify($user->mfa_secret, $input);
        if ($step !== null) {
            // The same code cannot be used twice, even inside its 30 seconds.
            if ($user->mfa_last_step !== null && $step <= (int) $user->mfa_last_step) {
                return null;
            }
            $user->forceFill(['mfa_last_step' => $step])->save();

            return 'totp';
        }

        return $this->useRecoveryCode($user, $input) ? 'recovery' : null;
    }

    /** @return list<string> eight new single-use codes, shown once; the old ones stop working */
    public function newRecoveryCodes(User $user, bool $save = true): array
    {
        $codes = [];
        for ($i = 0; $i < config('mfa.recovery_code_count'); $i++) {
            $hex = strtoupper(bin2hex(random_bytes(4)));
            $codes[] = substr($hex, 0, 4).'-'.substr($hex, 4, 4);
        }

        $user->mfa_recovery_codes = array_map(fn ($code) => Hash::make($this->normalizeRecovery($code)), $codes);
        if ($save) {
            $user->save();
        }

        return $codes;
    }

    public function recoveryCodesLeft(User $user): int
    {
        return count($user->mfa_recovery_codes ?? []);
    }

    private function useRecoveryCode(User $user, string $input): bool
    {
        $typed = $this->normalizeRecovery($input);
        if (! preg_match('/^[0-9A-F]{8}$/', $typed)) {
            return false;
        }

        $hashes = $user->mfa_recovery_codes ?? [];
        foreach ($hashes as $index => $hash) {
            if (Hash::check($typed, $hash)) {
                unset($hashes[$index]); // each one works once
                $user->mfa_recovery_codes = array_values($hashes);
                $user->save();

                return true;
            }
        }

        return false;
    }

    private function normalizeRecovery(string $code): string
    {
        return strtoupper(preg_replace('/[^0-9A-Za-z]/', '', $code));
    }
}
