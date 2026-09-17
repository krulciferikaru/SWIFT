<?php

namespace App\Http\Controllers;

use App\Services\PhilSmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SmsController extends Controller
{
    public function __construct(private PhilSmsService $sms) {}

    /**
     * POST /api/sms/send
     * Sends an ad-hoc SMS to any number. Used by the admin/secretary
     * manual-send tool in Settings.
     */
    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string'],
            'message' => ['required', 'string', 'max:300'],
        ]);

        $number = PhilSmsService::normalizeNumber($validated['phone']);
        $result = $this->sms->send($number, $validated['message']);

        return response()->json($result, $result['success'] ? 200 : 500);
    }
}
