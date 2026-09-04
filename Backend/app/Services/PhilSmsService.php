<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PhilSmsService
{
    protected string $endpoint = 'https://app.philsms.com/api/v3/sms/send';

    public function send(string $recipient, string $message): array
    {
        $token = config('services.philsms.token');

        if (!$token) {
            Log::warning('PhilSMS: attempted to send without an API token configured.');
            return ['success' => false, 'message' => 'SMS service is not configured.'];
        }

        try {
            $response = Http::withToken($token)
                ->acceptJson()
                ->post($this->endpoint, [
                    'recipient' => $recipient,
                    'sender_id' => config('services.philsms.sender_id'),
                    'type' => 'plain',
                    'message' => $message,
                ]);

            if ($response->successful() && ($response->json('status') === 'success')) {
                return ['success' => true, 'message' => null];
            }

            Log::warning('PhilSMS send failed', ['response' => $response->json()]);
            return ['success' => false, 'message' => $response->json('message') ?? 'Failed to send SMS.'];
        } catch (\Throwable $e) {
            Log::error('PhilSMS send exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => 'SMS service is currently unavailable.'];
        }
    }

    public static function normalizeNumber(string $number): string
    {
        $digits = preg_replace('/\D/', '', $number);

        if (str_starts_with($digits, '0')) {
            $digits = '63' . substr($digits, 1);
        } elseif (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '63' . $digits;
        }

        return $digits;
    }
}