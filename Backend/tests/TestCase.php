<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Cache;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Administrators have to set up an authenticator app in the real system; the many tests that
        // simply act as an admin should not each have to. The MFA tests switch it back on.
        config(['mfa.enforce_for_admins' => false]);
    }

    /** Marks a test user as having just confirmed their password (needed for the sensitive actions). */
    protected function passwordConfirmed(User $user): void
    {
        Cache::put('password-confirmed:user-'.$user->id, true, now()->addMinutes(10));
    }
}
