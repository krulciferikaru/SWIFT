<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Audit;
use App\Services\MfaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Setting up and looking after the authenticator app someone signs in with.
 *
 * Administrators must use one. Everyone else (secretaries, field collectors and subscribers) may
 * switch it on from their own Settings if they want the extra protection, and may switch it off
 * again. An administrator can never switch it off, only move it to a new phone.
 */
class MfaController extends Controller
{
    /** How long a person has to scan the new phone's QR code and type its first code. */
    private const REPLACEMENT_MINUTES = 30;

    public function __construct(private MfaService $mfa) {}

    private function wrongCode(): JsonResponse
    {
        return response()->json([
            'message' => 'That code is not right.',
            'errors' => ['code' => ['That code is not right.']],
        ], 422);
    }

    /** GET /api/me/mfa */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'enabled' => (bool) $user->mfa_enabled_at,
            'enabled_at' => $user->mfa_enabled_at?->toIso8601String(),
            'recovery_codes_left' => $this->mfa->recoveryCodesLeft($user),
            'required' => $user->role === 'admin',
        ]);
    }

    /** POST /api/me/mfa/setup (asks for the password): a new secret, as text and as the address for the QR code. */
    public function setup(Request $request): JsonResponse
    {
        if ($request->user()->mfa_enabled_at) {
            return response()->json(['message' => 'Two-step sign-in is already on for your account.'], 422);
        }

        return response()->json($this->mfa->beginSetup($request->user()));
    }

    /** POST /api/me/mfa/enable  { code }: switches it on and returns the recovery codes, once. */
    public function enable(Request $request): JsonResponse
    {
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
        $validated = $request->validate(['code' => ['required', 'string', 'max:20']]);
        $user = $request->user();

        // A code from the app, or a recovery code (the way in when the phone is lost or stolen).
        if (! $user->mfa_enabled_at || $this->mfa->check($user, $validated['code']) === null) {
            return $this->wrongCode();
        }

        Audit::log('auth.mfa_codes_renewed', $user, null, [], $user);

        return response()->json(['recovery_codes' => $this->mfa->newRecoveryCodes($user)]);
    }

    /**
     * POST /api/me/mfa/replace  { code } (asks for the password): start moving it to a new phone.
     *
     * Needs a current code from the old app, or one of the recovery codes when that phone is lost or
     * stolen. The old app keeps working until the new one has been proven, so stopping half way leaves
     * nothing broken. (A recovery code used here is used up either way.)
     */
    public function replaceStart(Request $request): JsonResponse
    {
        $validated = $request->validate(['code' => ['required', 'string', 'max:20']]);
        $user = $request->user();

        if (! $user->mfa_enabled_at || $this->mfa->check($user, $validated['code']) === null) {
            return $this->wrongCode();
        }

        return response()->json($this->mfa->beginReplacement($user, self::REPLACEMENT_MINUTES));
    }

    /** POST /api/me/mfa/replace/confirm  { code }: the new phone's first code. Swaps over and gives new recovery codes. */
    public function replaceConfirm(Request $request): JsonResponse
    {
        $validated = $request->validate(['code' => ['required', 'string', 'max:20']]);
        $user = $request->user();

        $codes = $user->mfa_enabled_at ? $this->mfa->completeReplacement($user, $validated['code']) : null;
        if ($codes === null) {
            return response()->json([
                'message' => 'That code is not right, or the new phone was not set up in time. Check the code in the new app and try again.',
                'errors' => ['code' => ['That code is not right, or the new phone was not set up in time.']],
            ], 422);
        }

        // The old phone is no longer trusted, so every other sign-in is ended (if it was stolen, so is any
        // session someone opened with it). This one, on the new phone's owner's screen, stays.
        $current = $user->currentAccessToken();
        $user->tokens()->when($current instanceof PersonalAccessToken, fn ($q) => $q->where('id', '!=', $current->id))->delete();

        Audit::log('auth.mfa_replaced', $user, null, [], $user);

        return response()->json(['message' => 'Your new phone is set up.', 'recovery_codes' => $codes]);
    }

    /**
     * DELETE /api/me/mfa  { code } (asks for the password): switch it off.
     *
     * Not for administrators, who must keep it. Needs a code from the app (or a recovery code), so
     * someone who only has the password cannot switch it off.
     */
    public function disable(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'admin') {
            return response()->json(['message' => 'Two-step sign-in is required for administrators. You can move it to a new phone, but not switch it off.'], 403);
        }

        $validated = $request->validate(['code' => ['required', 'string', 'max:30']]);
        if (! $user->mfa_enabled_at || $this->mfa->check($user, $validated['code']) === null) {
            return $this->wrongCode();
        }

        $this->mfa->clear($user);
        Audit::log('auth.mfa_disabled', $user, null, [], $user);

        return response()->json(['message' => 'Two-step sign-in is off.', 'user' => $user->fresh()]);
    }

    /**
     * POST /api/users/{user}/mfa/reset (administrators, asks for their password).
     *
     * For someone who lost their phone and has no recovery codes left. Their two-step sign-in is
     * switched off and they are signed out everywhere; an administrator is asked to set it up again
     * at the next sign-in, anyone else may do it again from Settings.
     */
    public function adminReset(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Use "Set up on a new phone" in Settings for your own account.'], 422);
        }
        if (! $user->mfa_enabled_at) {
            return response()->json(['message' => 'Two-step sign-in is not on for that account.'], 422);
        }

        $this->mfa->clear($user);
        $user->tokens()->delete();
        Audit::log('auth.mfa_reset', $user, $user->name, ['by' => $request->user()->name]);

        return response()->json(['message' => "Two-step sign-in was reset for {$user->name}. They are signed out everywhere."]);
    }
}
