<?php

namespace App\Support;

/**
 * Time-based one-time passwords (RFC 6238), the 6-digit codes that authenticator apps such as
 * Google Authenticator, Microsoft Authenticator and Authy show and refresh every 30 seconds.
 *
 * Kept as a small, dependency-free class: a secret is shared once (as a QR code), and from then
 * on both sides work out the same code from the secret and the time of day.
 */
class Totp
{
    public const PERIOD = 30;
    public const DIGITS = 6;

    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /** Seconds since 1970. Goes through the framework clock so tests can move time. */
    private static function now(): int
    {
        return \Illuminate\Support\Carbon::now()->getTimestamp();
    }

    /** A new random secret, base32 text (what the authenticator app stores). */
    public static function generateSecret(int $bytes = 20): string
    {
        return self::base32Encode(random_bytes($bytes));
    }

    /** The code for a moment in time (now by default). */
    public static function code(string $secret, ?int $time = null, int $digits = self::DIGITS): string
    {
        return self::codeForStep($secret, intdiv($time ?? self::now(), self::PERIOD), $digits);
    }

    public static function codeForStep(string $secret, int $step, int $digits = self::DIGITS): string
    {
        $key = self::base32Decode($secret);
        $hash = hash_hmac('sha1', pack('N*', 0, $step), $key, true);
        $offset = ord($hash[19]) & 0x0F;
        $value = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($value % (10 ** $digits)), $digits, '0', STR_PAD_LEFT);
    }

    /**
     * Checks a typed code. One step either side is accepted (a phone clock a few seconds off).
     * Returns the time step that matched, so the caller can refuse to accept the same step twice,
     * or null when the code is wrong.
     */
    public static function verify(string $secret, string $code, ?int $time = null, int $window = 1): ?int
    {
        $code = preg_replace('/\s+/', '', $code);
        if (! preg_match('/^\d{6}$/', $code)) {
            return null;
        }

        $current = intdiv($time ?? self::now(), self::PERIOD);
        for ($offset = -$window; $offset <= $window; $offset++) {
            $step = $current + $offset;
            if ($step >= 0 && hash_equals(self::codeForStep($secret, $step), $code)) {
                return $step;
            }
        }

        return null;
    }

    /** The address an authenticator app reads from the QR code. */
    public static function uri(string $account, string $issuer, string $secret): string
    {
        return 'otpauth://totp/'.rawurlencode($issuer.':'.$account)
            .'?secret='.$secret
            .'&issuer='.rawurlencode($issuer)
            .'&algorithm=SHA1&digits='.self::DIGITS.'&period='.self::PERIOD;
    }

    public static function base32Encode(string $data): string
    {
        $bits = '';
        foreach (str_split($data) as $char) {
            $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= self::ALPHABET[bindec(str_pad($chunk, 5, '0'))];
        }

        return $out;
    }

    public static function base32Decode(string $text): string
    {
        $bits = '';
        foreach (str_split(strtoupper(preg_replace('/[\s=]/', '', $text))) as $char) {
            $position = strpos(self::ALPHABET, $char);
            if ($position === false) {
                continue;
            }
            $bits .= str_pad(decbin($position), 5, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $out .= chr(bindec($byte));
            }
        }

        return $out;
    }
}
