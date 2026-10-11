<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Cache;

abstract class TestCase extends BaseTestCase
{
    /** Marks a test user as having just confirmed their password (needed for the sensitive actions). */
    protected function passwordConfirmed(User $user): void
    {
        Cache::put('password-confirmed:user-'.$user->id, true, now()->addMinutes(10));
    }
}
