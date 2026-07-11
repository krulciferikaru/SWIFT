<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriber', function (Blueprint $table) {
            $table->string('password')->nullable()->after('email');
            $table->enum('account_status', ['pending', 'active', 'rejected'])
                ->default('pending')
                ->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('subscriber', function (Blueprint $table) {
            $table->dropColumn(['password', 'account_status']);
        });
    }
};