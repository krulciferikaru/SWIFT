<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\PasswordResetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PasswordResetController extends Controller
{
    public function __construct(private PasswordResetService $reset) {}

    /**
     * POST /api/password/forgot  { login }
     *
     * The answer is the same whether or not a code was sent, so this cannot be used to find out
     * which numbers belong to accounts.
     */
    public function forgot(Request $request): JsonResponse
    {
        $validated = $request->validate(['login' => ['required', 'string', 'max:255']]);

        $this->reset->request($validated['login']);

        return response()->json([
            'message' => 'If that number belongs to an account with a verified mobile number, we have sent a 6-digit code. It works for 10 minutes.',
        ]);
    }

    /** POST /api/password/reset  { login, code, password, password_confirmation } */
    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'login' => ['required', 'string', 'max:255'],
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $result = $this->reset->reset($validated['login'], $validated['code'], $validated['password']);

        return response()->json(['message' => $result['message']], $result['ok'] ? 200 : 422);
    }
}
