<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * An account that is not Active (switched to Inactive, or still waiting for approval) can do nothing,
 * even with a sign-in that was still open. Changing the status also ends its sign-ins; this is the second
 * lock, so a missed one can never leave an Inactive account working.
 */
class EnsureAccountActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->account_status !== 'active') {
            $user->currentAccessToken()?->delete();

            return response()->json(['message' => 'Your account is not available. Contact a secretary or an administrator.'], 401);
        }

        return $next($request);
    }
}
