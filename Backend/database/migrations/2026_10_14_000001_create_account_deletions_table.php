<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A short note kept when a subscriber deletes their own account: who, when, and the reason they
 * gave. The subscriber's billing record stays (archived); this only says why it was archived.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_deletions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('subscriber_id')->nullable()->index();
            $table->string('subscriber_name');
            $table->string('reason', 40)->nullable();
            $table->string('detail', 500)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_deletions');
    }
};
