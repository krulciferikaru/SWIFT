<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sensitive actions (changing what someone is allowed to do, resetting a password, deleting for
 * good) need the person to have typed their own password in the last 10 minutes, even though
 * they are already signed in. That way an unattended screen or a stolen session cannot do them.
 *
 * The confirmation belongs to the sign-in (the token), so it ends with it. Signing in counts as one:
 * the person has just typed their password (and the code), so they are not asked again straight away.
 */
class CheckPasswordConfirmed
{
    public const MINUTES = 10;

    public static function cacheKey(Request $request): string
    {
        $user = $request->user();
        $token = $user->currentAccessToken();

        // A real sign-in has a token id; anything else (tests, internal calls) falls back to the person.
        return 'password-confirmed:'.($token instanceof PersonalAccessToken && $token->id ? 'token-'.$token->id : 'user-'.$user->id);
    }

    /** A fresh sign-in has just proved the password, so it starts out confirmed for the usual 10 minutes. */
    public static function confirmNewSignIn(PersonalAccessToken $token): void
    {
        Cache::put('password-confirmed:token-'.$token->id, true, now()->addMinutes(self::MINUTES));
    }

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || ! Cache::get(self::cacheKey($request))) {
            // 423 Locked: the front end recognises this, asks for the password, and retries.
            return response()->json([
                'message' => 'Please confirm your password to continue.',
                'password_confirmation_required' => true,
            ], 423);
        }

        return $next($request);
    }
}
