<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Audit;
use App\Services\MfaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** An administrator setting up (and looking after) the authenticator app they sign in with. */
class MfaController extends Controller
{
    public function __construct(private MfaService $mfa) {}

    private function refuseNonAdmin(Request $request): ?JsonResponse
    {
        return $request->user()->role === 'admin'
            ? null
            : response()->json(['message' => 'Two-step sign-in with an authenticator app is for administrators.'], 403);
    }

    /** GET /api/me/mfa */
    public function status(Request $request): JsonResponse
    {
        if ($refused = $this->refuseNonAdmin($request)) {
            return $refused;
        }
        $user = $request->user();

        return response()->json([
            'enabled' => (bool) $user->mfa_enabled_at,
            'enabled_at' => $user->mfa_enabled_at?->toIso8601String(),
            'recovery_codes_left' => $this->mfa->recoveryCodesLeft($user),
        ]);
    }

    /** POST /api/me/mfa/setup (asks for the password): a new secret, as text and as the address for the QR code. */
    public function setup(Request $request): JsonResponse
    {
        if ($refused = $this->refuseNonAdmin($request)) {
            return $refused;
        }
        if ($request->user()->mfa_enabled_at) {
            return response()->json(['message' => 'Two-step sign-in is already on for your account.'], 422);
        }

        return response()->json($this->mfa->beginSetup($request->user()));
    }

    /** POST /api/me/mfa/enable  { code }: switches it on and returns the recovery codes, once. */
    public function enable(Request $request): JsonResponse
    {
        if ($refused = $this->refuseNonAdmin($request)) {
            return $refused;
        }
        $validated = $request->validate(['code' => ['required', 'string', 'max:20']]);

        $codes = $this->mfa->enable($request->user(), $validated['code']);
        if ($codes === null) {
            return response()->json([
                'message' => 'That code is not right. Check the code in your app (it changes every 30 seconds) and try again.',
                'errors' => ['code' => ['That code is not right. Check the code in your app (it changes every 30 seconds) and try again.']],
            ], 422);
        }

        Audit::log('auth.mfa_enabled', $request->user(), null, [], $request->user());

        return response()->json([
            'message' => 'Two-step sign-in is on.',
            'recovery_codes' => $codes,
            'user' => $request->user()->fresh(),
        ]);
    }

    /** POST /api/me/mfa/recovery-codes  { code } (asks for the password): replaces the recovery codes. */
    public function recoveryCodes(Request $request): JsonResponse
    {
        if ($refused = $this->refuseNonAdmin($request)) {
            return $refused;
        }
        $validated = $request->validate(['code' => ['required', 'string', 'max:20']]);
        $user = $request->user();

        // A code from the app, not a recovery code: this is how the codes are replaced, not used up.
        if (! $user->mfa_enabled_at || $this->mfa->check($user, $validated['code']) !== 'totp') {
            return response()->json([
                'message' => 'That code is not right.',
                'errors' => ['code' => ['That code is not right.']],
            ], 422);
        }

        Audit::log('auth.mfa_codes_renewed', $user, null, [], $user);

        return response()->json(['recovery_codes' => $this->mfa->newRecoveryCodes($user)]);
    }
}
