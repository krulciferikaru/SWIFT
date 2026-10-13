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
 *
 * A few actions change how someone proves who they are (switching on an authenticator app, changing the
 * mobile number codes are sent to). Those use `password.confirmed:fresh`: the sign-in does not count,
 * the password has to be typed again for them, so a stranger at a device left signed in cannot do them
 * just after the owner walked away. The one exception is an administrator's required first setup, where
 * there is no choice and the sign-in has to count.
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

    /** Marks a confirmation that came from signing in, not from typing the password again. */
    public const FROM_SIGN_IN = 'sign-in';

    /** A fresh sign-in has just proved the password, so it starts out confirmed for the usual 10 minutes. */
    public static function confirmNewSignIn(PersonalAccessToken $token): void
    {
        Cache::put('password-confirmed:token-'.$token->id, self::FROM_SIGN_IN, now()->addMinutes(self::MINUTES));
    }

    public function handle(Request $request, Closure $next, ?string $mode = null): Response
    {
        $confirmed = $request->user() ? Cache::get(self::cacheKey($request)) : null;

        // 'fresh': typed again for this, not just carried over from signing in (unless they have no choice).
        if ($mode === 'fresh' && $confirmed === self::FROM_SIGN_IN && ! $request->user()->mfa_setup_required) {
            $confirmed = null;
        }

        if (! $request->user() || ! $confirmed) {
            // 423 Locked: the front end recognises this, asks for the password, and retries.
            return response()->json([
                'message' => 'Please confirm your password to continue.',
                'password_confirmation_required' => true,
            ], 423);
        }

        return $next($request);
    }
}
