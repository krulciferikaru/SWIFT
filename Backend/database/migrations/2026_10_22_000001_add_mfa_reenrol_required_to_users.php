<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When an administrator resets a secretary's or field collector's two-step sign-in (lost phone), that
 * person has to set it up again the next time they sign in, so it can never be removed silently.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('mfa_reenrol_required')->default(false)->after('mfa_last_step');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('mfa_reenrol_required');
        });
    }
};
