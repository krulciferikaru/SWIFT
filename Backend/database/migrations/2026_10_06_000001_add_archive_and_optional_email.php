<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "Archive" is a soft delete: rows stay in the table until someone
        // permanently deletes them from the Archive module.
        Schema::table('subscriber', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('plan', function (Blueprint $table) {
            $table->softDeletes();
        });

        // Contact number is now the primary identifier; email is optional.
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable(false)->change();
        });

        Schema::table('plan', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('subscriber', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
