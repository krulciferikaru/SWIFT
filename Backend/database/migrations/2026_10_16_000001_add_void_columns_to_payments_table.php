<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A wrongly recorded payment is never edited or deleted: it is cancelled ("voided"), with who did
 * it, when and why, and stays in the history. Cancelled payments do not count towards a balance,
 * a report or a total. The correct payment is then recorded as a new one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->timestamp('voided_at')->nullable()->index();
            $table->unsignedBigInteger('voided_by')->nullable();
            $table->string('void_reason', 255)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['voided_at', 'voided_by', 'void_reason']);
        });
    }
};
