<?php

namespace App\Http\Controllers;

use App\Services\PhoneVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PhoneVerificationController extends Controller
{
    public function __construct(private PhoneVerificationService $verification) {}

    /** POST /api/me/phone/send-code */
    public function send(Request $request): JsonResponse
    {
        $result = $this->verification->send($request->user());

        return response()->json(['message' => $result['message']], $result['status']);
    }

    /** POST /api/me/phone/verify */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate(['code' => ['required', 'digits:6']]);

        $result = $this->verification->confirm($request->user(), $validated['code']);

        return response()->json(
            ['message' => $result['message'], 'user' => $result['ok'] ? $request->user()->fresh() : null],
            $result['status'],
        );
    }
}
