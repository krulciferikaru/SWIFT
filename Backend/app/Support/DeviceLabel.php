<?php

namespace App\Support;

/**
 * A short, human name for where someone is signed in ("Chrome on Windows"), worked out from what the
 * browser says about itself. Browsers describe themselves loosely, so this is a good guess, not a fact.
 */
class DeviceLabel
{
    public static function from(?string $userAgent): string
    {
        $ua = (string) $userAgent;
        if ($ua === '') {
            return 'Unknown device';
        }

        $browser = match (true) {
            (bool) preg_match('/Edg(e|A|iOS)?\//i', $ua) => 'Edge',
            (bool) preg_match('/OPR\/|Opera/i', $ua) => 'Opera',
            (bool) preg_match('/SamsungBrowser/i', $ua) => 'Samsung Internet',
            (bool) preg_match('/Firefox|FxiOS/i', $ua) => 'Firefox',
            (bool) preg_match('/Chrome|CriOS|Chromium/i', $ua) => 'Chrome',
            (bool) preg_match('/Safari/i', $ua) => 'Safari',
            default => null,
        };

        $system = match (true) {
            (bool) preg_match('/iPhone/i', $ua) => 'iPhone',
            (bool) preg_match('/iPad/i', $ua) => 'iPad',
            (bool) preg_match('/Android/i', $ua) => 'Android',
            (bool) preg_match('/Windows/i', $ua) => 'Windows',
            (bool) preg_match('/Macintosh|Mac OS X/i', $ua) => 'Mac',
            (bool) preg_match('/CrOS/i', $ua) => 'Chromebook',
            (bool) preg_match('/Linux/i', $ua) => 'Linux',
            default => null,
        };

        if ($browser && $system) {
            return "$browser on $system";
        }

        return $browser ?? $system ?? 'Unknown device';
    }

    /** "203.0.113.45" -> "203.0.113.•"; an IPv6 address keeps only its first three groups. */
    public static function maskedIp(?string $ip): ?string
    {
        if (! $ip) {
            return null;
        }

        if (str_contains($ip, ':')) {
            return implode(':', array_slice(explode(':', $ip), 0, 3)).':…';
        }

        $parts = explode('.', $ip);
        if (count($parts) === 4) {
            $parts[3] = '•';
        }

        return implode('.', $parts);
    }
}
