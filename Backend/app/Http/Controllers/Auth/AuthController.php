<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    // Public self-registration for subscribers only
    public function register(Request $request)
    {
        $requestData = $request->all();

        if (empty($requestData)) {
            $content = $request->getContent();
            $requestData = $content ? json_decode($content, true) : [];

            if (! is_array($requestData)) {
                parse_str($content, $requestData);
            }
        }

        $existingSubscriber = Subscriber::where('email', $requestData['email'] ?? null)->first();

        // If claiming an existing subscriber record, relax the email-uniqueness rule for that table
        $emailRule = $existingSubscriber
            ? 'required|string|email|max:255|unique:users,email'
            : 'required|string|email|max:255|unique:users,email|unique:subscriber,email';

        $validator = Validator::make($requestData, [
            'name' => 'required|string|max:255',
            'email' => $emailRule,
            'password' => 'required|string|min:8|confirmed',
            'contact_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($existingSubscriber) {
            // Claiming an existing subscriber record — don't create a new Subscriber row.
            // Instead, create a pending User linked to the existing subscriber_id for staff to verify.
            if (User::where('subscriber_id', $existingSubscriber->subscriber_id)->exists()) {
                return response()->json([
                    'errors' => ['email' => ['An account for this subscriber already exists. Please contact support if you cannot log in.']],
                ], 422);
            }

            $user = User::create([
                'subscriber_id' => $existingSubscriber->subscriber_id,
                'name' => $requestData['name'],
                'email' => $requestData['email'],
                'contact_number' => $requestData['contact_number'] ?? $existingSubscriber->contact_number,
                'password' => Hash::make($requestData['password']),
                'role' => 'subscriber',
                'account_status' => 'pending',
            ]);

            return response()->json([
                'message' => 'Registration submitted. Since this email matches an existing subscriber record, our staff will verify your identity before approving your account.',
                'claim' => true,
                'user' => $user,
            ], 201);
        }

        $subscriber = Subscriber::create([
            'name' => $requestData['name'],
            'address' => $requestData['address'] ?? null,
            'contact_number' => $requestData['contact_number'] ?? null,
            'email' => $requestData['email'],
            'password' => Hash::make($requestData['password']),
            'account_status' => 'pending',
            'status' => 'Unpaid',
        ]);

        return response()->json([
            'message' => 'Registration submitted. Awaiting approval.',
            'subscriber' => $subscriber,
        ], 201);
    }

    public function login(Request $request)
    {
        $requestData = $request->all();

        if (empty($requestData)) {
            $content = $request->getContent();
            $requestData = $content ? json_decode($content, true) : [];

            if (! is_array($requestData)) {
                parse_str($content, $requestData);
            }
        }

        $validator = Validator::make($requestData, [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $requestData['email'])->first();
        $subscriber = Subscriber::where('email', $requestData['email'])->first();

        if (! $user || ! Hash::check($requestData['password'], $user->password)) {
            if ($subscriber && $subscriber->account_status === 'pending') {
                return response()->json(['message' => 'Your account is awaiting approval.'], 403);
            }

            if ($subscriber && $subscriber->account_status === 'rejected') {
                return response()->json(['message' => 'Your account has been rejected.'], 403);
            }

            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        if ($user->account_status === 'pending') {
            return response()->json(['message' => 'Your account is awaiting approval.'], 403);
        }

        if ($user->account_status === 'inactive') {
            return response()->json(['message' => 'Your account has been deactivated. Contact a secretary or an administrator.'], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
