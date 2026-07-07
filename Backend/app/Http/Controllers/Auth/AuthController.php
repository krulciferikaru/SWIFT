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
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'contact_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $subscriber = Subscriber::create([
            'name' => $request->name,
            'address' => $request->address,
            'contact_number' => $request->contact_number,
            'email' => $request->email,
            'status' => 'Unpaid',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'contact_number' => $request->contact_number,
            'password' => Hash::make($request->password),
            'role' => 'subscriber',
            'account_status' => 'pending',
            'subscriber_id' => $subscriber->subscriber_id,
        ]);

        return response()->json([
            'message' => 'Registration submitted. Awaiting approval.',
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        if ($user->account_status === 'pending') {
            return response()->json(['message' => 'Your account is awaiting approval.'], 403);
        }

        if ($user->account_status === 'rejected') {
            return response()->json(['message' => 'Your account has been rejected.'], 403);
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