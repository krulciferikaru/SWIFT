<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * A normal (not "keep me signed in") sign-in lasts an hour, counted from the person's last
 * request instead of from the moment they signed in. The website pings the server every few
 * minutes while the page is open, so a tab that stays open never runs out, and a tab that is
 * closed lets the sign-in lapse an hour later.
 *
 * "Keep me signed in" tokens keep their fixed length and are never touched here.
 */
class SlideSession
{
    public const NORMAL_TOKEN_NAME = 'auth_token';

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $token = $request->user()?->currentAccessToken();

        // Tests and first-party sessions use a transient token with nothing to extend.
        if ($token instanceof PersonalAccessToken && $token->name === self::NORMAL_TOKEN_NAME && $token->expires_at) {
            $window = max((int) config('sanctum.login_token_hours'), 1) * 3600;

            // Only write when a few minutes of the window have been used, not on every request.
            if ($token->expires_at->lt(now()->addSeconds($window - 300))) {
                $token->forceFill(['expires_at' => now()->addSeconds($window)])->save();
            }
        }

        return $response;
    }
}
