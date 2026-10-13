<?php

namespace App\Http\Controllers;

use App\Models\PhoneVerification;
use App\Services\Audit;
use App\Services\PhoneVerificationService;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PhoneVerificationController extends Controller
{
    public function __construct(private PhoneVerificationService $verification) {}

    /**
     * PATCH /api/me/mobile-number  { contact_number }
     *
     * Staff add or change their own number. A subscriber's number belongs to their subscriber
     * record and is changed by staff, so this is not open to them. Changing it clears the
     * verification: the new number has to be proved with a code again.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->subscriber_id) {
            return response()->json(['message' => 'Ask the office to change your mobile number.'], 403);
        }

        $validated = $request->validate([
            'contact_number' => ['required', 'string', 'max:20', 'regex:/^(\+?63|0)9[\d\s-]{9,13}$/', Rule::unique('users', 'contact_number')->ignore($user->id)],
        ], [
            'contact_number.regex' => 'Enter a mobile number such as 0917 123 4567.',
        ]);

        $user->forceFill(['contact_number' => trim($validated['contact_number']), 'contact_verified_at' => null])->save();
        PhoneVerification::where('user_id', $user->id)->delete();
        Audit::log('user.mobile_changed', $user, null, [], $user);

        return response()->json([
            'message' => 'Your mobile number was saved. Verify it with a texted code so you can use Forgot password.',
            'user' => $user->fresh(),
        ]);
    }

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
