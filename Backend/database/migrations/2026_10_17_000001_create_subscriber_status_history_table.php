<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Every time a subscriber's service status changes (Active, Unpaid, Disconnected) a line is kept:
 * what it became, what it was, when, and whether staff or the system did it. Subscribers have a
 * right to see it, and it lets the company answer "when did this account become Unpaid?".
 *
 * Statuses before this table existed were not recorded, so each existing subscriber starts with one
 * "start" line saying what they were when the history began.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriber_status_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('subscriber_id')->index();
            $table->string('status', 20);
            $table->string('previous_status', 20)->nullable();
            // start | created | approved | automatic | staff | system
            $table->string('source', 20);
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        // The history begins today for everyone who is already a subscriber.
        $now = now();
        DB::table('subscriber')->where('account_status', 'active')->orderBy('subscriber_id')->each(function ($row) use ($now) {
            DB::table('subscriber_status_history')->insert([
                'subscriber_id' => $row->subscriber_id,
                'status' => $row->status,
                'previous_status' => null,
                'source' => 'start',
                'changed_by' => null,
                'created_at' => $now,
            ]);
        }, 200, 'subscriber_id');
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriber_status_history');
    }
};
