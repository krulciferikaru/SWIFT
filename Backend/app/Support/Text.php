<?php

namespace App\Support;

class Text
{
    /** Uppercases the first letter of each word (also after - ' .), leaving the rest as typed. */
    public static function capitalizeWords(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return preg_replace_callback(
            '/(^|[\s\-\'’.])(\p{L})/u',
            fn ($m) => $m[1] . mb_strtoupper($m[2]),
            trim($value)
        );
    }
}
