<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * What a subscriber was billed in a past month must not change when their plan, or the plan's
 * price, changes later. So two things are remembered with the month they take effect from:
 *   - which plan a subscriber was on  (subscriber_plan_history)
 *   - what a plan cost                (plan_rate_history)
 * Billing then prices each month by what applied in that month.
 *
 * Changes made before this existed were not recorded, so everyone starts with one line saying
 * "this is the plan / the price", effective from the beginning of time: existing months are
 * priced exactly as they are today. Only changes from now on are kept apart.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_rate_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('plan_id')->index();
            $table->decimal('monthly_rate', 10, 2);
            $table->date('effective_from');
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('subscriber_plan_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('subscriber_id')->index();
            $table->unsignedBigInteger('plan_id');
            $table->date('effective_from');
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        $now = now();
        DB::table('plan')->orderBy('plan_id')->each(function ($plan) use ($now) {
            DB::table('plan_rate_history')->insert([
                'plan_id' => $plan->plan_id, 'monthly_rate' => $plan->monthly_rate,
                'effective_from' => '2000-01-01', 'created_at' => $now,
            ]);
        }, 200, 'plan_id');

        DB::table('subscriber')->whereNotNull('plan_id')->orderBy('subscriber_id')->each(function ($sub) use ($now) {
            DB::table('subscriber_plan_history')->insert([
                'subscriber_id' => $sub->subscriber_id, 'plan_id' => $sub->plan_id,
                'effective_from' => '2000-01-01', 'created_at' => $now,
            ]);
        }, 200, 'subscriber_id');
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriber_plan_history');
        Schema::dropIfExists('plan_rate_history');
    }
};
