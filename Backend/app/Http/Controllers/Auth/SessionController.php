<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Audit;
use App\Support\DeviceLabel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/** The places someone is signed in, and ending them. Only ever a person's own. */
class SessionController extends Controller
{
    /**
     * GET /api/me/sessions
     *
     * One row for each place the person is signed in, newest first. The network address is shown with its
     * last part hidden; the full one is kept only so it can be checked if something goes wrong.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $current = $user->currentAccessToken();

        $rows = $user->tokens()->orderByDesc('last_used_at')->orderByDesc('id')->get()->map(fn (PersonalAccessToken $t) => [
            'id' => $t->id,
            'device' => DeviceLabel::from($t->user_agent),
            'network' => DeviceLabel::maskedIp($t->ip_address),
            'kept_signed_in' => $t->name === 'auth_token_remember',
            'signed_in_at' => $t->created_at?->toIso8601String(),
            'last_used_at' => $t->last_used_at?->toIso8601String(),
            'is_current' => $current instanceof PersonalAccessToken && $current->id === $t->id,
        ]);

        return response()->json(['data' => $rows]);
    }

    /** DELETE /api/me/sessions/{id}: ends one other sign-in. This one is ended with Logout. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $current = $user->currentAccessToken();

        if ($current instanceof PersonalAccessToken && $current->id === $id) {
            return response()->json(['message' => 'That is the sign-in you are using now. Use Logout to end it.'], 422);
        }

        $token = $user->tokens()->whereKey($id)->first();
        if (! $token) {
            return response()->json(['message' => 'That sign-in is already ended.'], 404);
        }

        $label = DeviceLabel::from($token->user_agent);
        $token->delete();
        Audit::log('auth.session_ended', $user, null, ['device' => $label], $user);

        return response()->json(['message' => "Signed out of {$label}."]);
    }

    /**
     * POST /api/me/sessions/end-others
     *
     * Signs the person out of every other place they are signed in, and keeps this one. For when a
     * device is lost, a password may have been seen, or an account may have been taken over.
     */
    public function endOthers(Request $request): JsonResponse
    {
        $user = $request->user();
        $current = $user->currentAccessToken();

        $count = $user->tokens()
            ->when($current instanceof PersonalAccessToken, fn ($q) => $q->where('id', '!=', $current->id))
            ->delete();

        Audit::log('auth.sessions_ended', $user, null, ['count' => $count], $user);

        return response()->json([
            'count' => $count,
            'message' => $count === 0
                ? 'You were not signed in anywhere else.'
                : 'Signed out of '.$count.' other '.($count === 1 ? 'place' : 'places').'.',
        ]);
    }
}
