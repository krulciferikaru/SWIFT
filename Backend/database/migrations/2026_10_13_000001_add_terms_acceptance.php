<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Remembers that a person agreed to the Terms of Service and Privacy Policy, and which version,
 * so it is possible to tell who agreed to which wording. Existing accounts have no record.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['users', 'subscriber'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->timestamp('terms_accepted_at')->nullable();
                $t->string('terms_version', 40)->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['users', 'subscriber'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropColumn(['terms_accepted_at', 'terms_version']);
            });
        }
    }
};
