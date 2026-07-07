<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('contact_number')->nullable()->after('email');
            $table->enum('role', ['admin', 'secretary', 'subscriber'])->default('subscriber')->after('password');
            $table->enum('account_status', ['pending', 'active', 'rejected'])->default('pending')->after('role');

            $table->unsignedBigInteger('subscriber_id')->nullable()->after('account_status');
            $table->foreign('subscriber_id')
                  ->references('subscriber_id')
                  ->on('subscriber')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['subscriber_id']);
            $table->dropColumn(['contact_number', 'role', 'account_status', 'subscriber_id']);
        });
    }
};