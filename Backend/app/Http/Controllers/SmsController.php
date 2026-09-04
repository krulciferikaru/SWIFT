<?php

namespace App\Http\Controllers;

use App\Services\PhilSmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsController extends Controller
{
    public function __construct(private PhilSmsService $sms) {}

    public function test(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string'],
            'message' => ['nullable', 'string', 'max:300'],
        ]);

        $number = PhilSmsService::normalizeNumber($validated['phone']);
        $result = $this->sms->send($number, $validated['message'] ?? 'SWIFT SMS integration test.');

        return response()->json($result, $result['success'] ? 200 : 500);
    }
}