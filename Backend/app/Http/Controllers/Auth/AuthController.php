<?php

namespace App\Http\Controllers\Auth;

use App\Services\Audit;
use App\Http\Controllers\Controller;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public const BARANGAYS = [
        'Malete, Palayan City',
        'Santolan, Palayan City',
        'Caballero, Palayan City',
        'Ganaderia, Palayan City',
        'Caimito, Palayan City',
    ];

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

        $requestData['contact_number'] = trim((string) ($requestData['contact_number'] ?? ''));
        $requestData['email'] = trim((string) ($requestData['email'] ?? '')) ?: null;

        $existingSubscriber = $requestData['contact_number'] !== ''
            ? Subscriber::where('contact_number', $requestData['contact_number'])->first()
            : null;

        // Claiming an existing subscriber record: the mobile number (and any
        // email on file) already exists in the subscriber table, so only check
        // the users table.
        $contactRule = $existingSubscriber
            ? 'required|string|max:20|unique:users,contact_number'
            : 'required|string|max:20|unique:users,contact_number|unique:subscriber,contact_number';
        $emailRule = $existingSubscriber
            ? 'nullable|string|email|max:255|unique:users,email'
            : 'nullable|string|email|max:255|unique:users,email|unique:subscriber,email';

        $validator = Validator::make($requestData, [
            'first_name' => 'required|string|max:127',
            'last_name' => 'required|string|max:127',
            'contact_number' => $contactRule,
            'email' => $emailRule,
            'password' => 'required|string|min:8|confirmed',
            'address' => ['required', 'string', Rule::in(self::BARANGAYS)],
            'accept_terms' => ['accepted'],
        ], [
            'accept_terms.accepted' => 'You need to agree to the Terms of Service and Privacy Policy to register.',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $fullName = trim($requestData['first_name']) . ' ' . trim($requestData['last_name']);
        // Remember what the person agreed to, and which wording it was.
        $agreement = ['terms_accepted_at' => now(), 'terms_version' => config('legal.version')];

        if ($existingSubscriber) {
            // Claiming an existing subscriber record — don't create a new Subscriber row.
            // Instead, create a pending User linked to the existing subscriber_id for staff to verify.
            if (User::where('subscriber_id', $existingSubscriber->subscriber_id)->exists()) {
                return response()->json([
                    'errors' => ['contact_number' => ['An account for this subscriber already exists. Please contact support if you cannot log in.']],
                ], 422);
            }

            $user = User::create([
                'subscriber_id' => $existingSubscriber->subscriber_id,
                'name' => $fullName,
                'email' => $requestData['email'],
                'contact_number' => $requestData['contact_number'],
                'password' => Hash::make($requestData['password']),
                'role' => 'subscriber',
                'account_status' => 'pending',
                ...$agreement,
            ]);

            return response()->json([
                'message' => 'Registration submitted. Since this mobile number matches an existing subscriber record, our staff will verify your identity before approving your account.',
                'claim' => true,
                'user' => $user,
            ], 201);
        }

        $subscriber = Subscriber::create([
            'name' => $fullName,
            'address' => $requestData['address'] ?? null,
            'contact_number' => $requestData['contact_number'],
            'email' => $requestData['email'],
            'password' => Hash::make($requestData['password']),
            'account_status' => 'pending',
            'status' => 'Unpaid',
            ...$agreement,
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

        // "login" is the mobile number (subscribers) or email (staff accounts).
        // "email" is still accepted so older clients keep working.
        $identifier = trim((string) ($requestData['login'] ?? $requestData['email'] ?? ''));

        $validator = Validator::make(
            ['login' => $identifier, 'password' => $requestData['password'] ?? null],
            ['login' => 'required|string|max:255', 'password' => 'required|string'],
        );

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Wrong-password limit per account. It counts any name typed, whether or not such an
        // account exists, so the answer never reveals which accounts are real.
        $lockKey = 'login-failures:'.mb_strtolower($identifier);
        $maxFailures = config('ratelimit.login_max_failures');
        $windowSeconds = config('ratelimit.login_lockout_minutes') * 60;

        if (RateLimiter::tooManyAttempts($lockKey, $maxFailures)) {
            return $this->lockedResponse(RateLimiter::availableIn($lockKey));
        }

        $user = User::where('contact_number', $identifier)->orWhere('email', $identifier)->first();
        $subscriber = Subscriber::where('contact_number', $identifier)->orWhere('email', $identifier)->first();

        // Staff can add or change a subscriber's email/mobile number after the
        // login was created, so the users row may be out of date. Fall back to
        // the login linked to the matching subscriber record.
        if (! $user && $subscriber) {
            $user = User::where('subscriber_id', $subscriber->subscriber_id)->first();
        }

        if (! $user || ! Hash::check($requestData['password'], $user->password)) {
            RateLimiter::hit($lockKey, $windowSeconds);
            $attemptsLeft = max($maxFailures - RateLimiter::attempts($lockKey), 0);

            if ($attemptsLeft === 0) {
                Audit::log('auth.locked', null, $identifier, [], $user);

                return $this->lockedResponse(RateLimiter::availableIn($lockKey));
            }

            if ($subscriber && $subscriber->account_status === 'pending') {
                return response()->json(['message' => 'Your account is awaiting approval.'], 403);
            }

            if ($subscriber && $subscriber->account_status === 'rejected') {
                return response()->json(['message' => 'Your account has been rejected.'], 403);
            }

            Audit::log('auth.login_failed', null, $identifier, [], $user);

            return response()->json([
                'message' => 'Invalid credentials.',
                'attempts_left' => $attemptsLeft,
            ], 401);
        }

        RateLimiter::clear($lockKey);

        if ($user->account_status === 'pending') {
            return response()->json(['message' => 'Your account is awaiting approval.'], 403);
        }

        if ($user->account_status === 'inactive') {
            return response()->json(['message' => 'Your account has been rejected or deactivated. Contact a secretary or an administrator.'], 403);
        }

        // An archived subscriber's login is suspended until they are restored.
        if ($user->subscriber_id && ! $user->subscriber) {
            return response()->json(['message' => 'Your account is not available. Contact a secretary or an administrator.'], 403);
        }

        // "Keep me signed in" lasts longer; otherwise the sign-in lasts an hour after the last activity.
        $remember = filter_var($requestData['remember'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $expiresAt = $remember
            ? now()->addDays(config('sanctum.remember_token_days'))
            : now()->addHours(config('sanctum.login_token_hours'));

        // Only the normal sign-in slides with activity (see SlideSession); a kept one has a fixed end.
        $tokenName = $remember ? 'auth_token_remember' : \App\Http\Middleware\SlideSession::NORMAL_TOKEN_NAME;
        $token = $user->createToken($tokenName, ['*'], $expiresAt)->plainTextToken;

        Audit::log('auth.login', $user, null, ['remembered' => $remember], $user);

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
            'token' => $token,
            'expires_at' => $expiresAt->toIso8601String(),
        ]);
    }

    /** 429 with how long to wait, in the body (for the countdown) and in Retry-After. */
    private function lockedResponse(int $seconds)
    {
        $minutes = max((int) ceil($seconds / 60), 1);

        return response()->json([
            'message' => "Too many wrong attempts. Sign-in is paused for about {$minutes} ".($minutes === 1 ? 'minute' : 'minutes').'.',
            'locked' => true,
            'retry_after' => $seconds,
        ], 429)->header('Retry-After', (string) $seconds);
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
