<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Middleware\CheckPasswordConfirmed;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

class PasswordConfirmationController extends Controller
{
    /** POST /api/me/confirm-password  { password } */
    public function store(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'string']]);

        if (! Hash::check($request->input('password'), $request->user()->password)) {
            Audit::log('auth.confirm_failed', $request->user());

            return response()->json(['message' => 'That password is not correct.'], 422);
        }

        Cache::put(CheckPasswordConfirmed::cacheKey($request), true, now()->addMinutes(CheckPasswordConfirmed::MINUTES));

        return response()->json([
            'message' => 'Password confirmed.',
            'valid_for_minutes' => CheckPasswordConfirmed::MINUTES,
        ]);
    }
}
