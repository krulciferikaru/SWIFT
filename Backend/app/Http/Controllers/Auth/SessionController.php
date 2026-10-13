<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class SessionController extends Controller
{
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
