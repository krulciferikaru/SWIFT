<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * An administrator who has not set up the authenticator app yet can sign in, but can do nothing
 * else until they have. This is what makes the second step a must and not an option.
 */
class EnsureMfaEnrolled
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->mfa_setup_required && ! $request->is('api/me', 'api/me/mfa*', 'api/me/confirm-password', 'api/logout')) {
            return response()->json([
                'message' => 'Set up two-step sign-in first. Administrators need an authenticator app.',
                'mfa_setup_required' => true,
            ], 403);
        }

        return $next($request);
    }
}
