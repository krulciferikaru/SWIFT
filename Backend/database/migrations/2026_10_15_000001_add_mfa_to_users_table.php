<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Two-step sign-in with an authenticator app, required for administrators.
 *  - mfa_secret: the shared secret, encrypted
 *  - mfa_enabled_at: set once the person has proved their app works; until then it is only a pending setup
 *  - mfa_recovery_codes: single-use backup codes, stored hashed
 *  - mfa_last_step: the last 30-second step accepted, so a code cannot be used twice
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('mfa_secret')->nullable();
            $table->timestamp('mfa_enabled_at')->nullable();
            $table->text('mfa_recovery_codes')->nullable();
            $table->unsignedBigInteger('mfa_last_step')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['mfa_secret', 'mfa_enabled_at', 'mfa_recovery_codes', 'mfa_last_step']);
        });
    }
};
