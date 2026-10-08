<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Allows the request when the signed-in user holds at least one of the listed permissions.
 * Usage: ->middleware('permission:payments.view,payments.record')
 */
class CheckPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasAnyPermission($permissions)) {
            return response()->json(['message' => 'You do not have permission to do that.'], 403);
        }

        return $next($request);
    }
}
