<?php

namespace App\Http\Middleware;

use App\Services\MfaService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * For the most powerful actions (resetting someone's two-step sign-in, changing what a person may do): the
 * request must carry a current 6-digit code from the person's own authenticator app, on top of the password
 * the route already asks for. The password alone is not enough, so someone who has only the password, or an
 * unattended signed-in screen, cannot do them.
 *
 * Applies only to someone who has two-step sign-in on. (Administrators always do; where it is switched off
 * for development, the password is the only check.) A recovery code is not accepted here: moving to a new
 * phone first is the way to prove it is them when the old phone is lost.
 */
class RequireMfaCode
{
    public function __construct(private MfaService $mfa) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->mfa_enabled_at) {
            return $next($request);
        }

        $code = (string) $request->input('code', '');
        if ($code === '') {
            return response()->json([
                'message' => 'Type the current code from your authenticator app to continue.',
                'errors' => ['code' => ['Type the current code from your authenticator app to continue.']],
                'mfa_code_required' => true,
            ], 422);
        }

        if ($this->mfa->check($user, $code) !== 'totp') {
            return response()->json([
                'message' => 'That code is not right. Use the current code from your app (each code works once).',
                'errors' => ['code' => ['That code is not right. Use the current code from your app (each code works once).']],
                'mfa_code_required' => true,
            ], 422);
        }

        return $next($request);
    }
}
