<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\Subscriber;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

/**
 * Remembers which plan a subscriber was on, and what each plan cost, month by month, so that
 * a change today can never re-price a month that has already been billed.
 */
class RateHistoryService
{
    /** "The beginning of time": the first line for a plan or subscriber means it always applied. */
    public const FOREVER = '2000-01-01';

    /** The first day a change made today takes effect, according to the company's setting. */
    public static function defaultEffectiveFrom(?Carbon $today = null): Carbon
    {
        $month = ($today ?? Carbon::now())->copy()->startOfMonth();

        return config('billing.plan_change_effective') === 'current_month' ? $month : $month->addMonth();
    }

    public function recordPlanCreated(Plan $plan): void
    {
        DB::table('plan_rate_history')->insert([
            'plan_id' => $plan->plan_id, 'monthly_rate' => $plan->monthly_rate,
            'effective_from' => self::FOREVER, 'changed_by' => Auth::id(), 'created_at' => now(),
        ]);
    }

    /** The price changed: the new one applies from the date chosen by the company's setting. */
    public function recordPlanRateChange(Plan $plan, ?Carbon $effectiveFrom = null): void
    {
        $from = ($effectiveFrom ?? self::defaultEffectiveFrom())->toDateString();
        DB::table('plan_rate_history')->updateOrInsert(
            ['plan_id' => $plan->plan_id, 'effective_from' => $from],
            ['monthly_rate' => $plan->monthly_rate, 'changed_by' => Auth::id(), 'created_at' => now()],
        );
    }

    /** The subscriber has a plan (for the first time, or a different one). */
    public function recordSubscriberPlan(Subscriber $subscriber, ?Carbon $effectiveFrom = null): void
    {
        $first = ! DB::table('subscriber_plan_history')->where('subscriber_id', $subscriber->subscriber_id)->exists();
        $from = $first ? self::FOREVER : ($effectiveFrom ?? self::defaultEffectiveFrom())->toDateString();

        DB::table('subscriber_plan_history')->updateOrInsert(
            ['subscriber_id' => $subscriber->subscriber_id, 'effective_from' => $from],
            ['plan_id' => $subscriber->plan_id, 'changed_by' => Auth::id(), 'created_at' => now()],
        );
    }

    /**
     * What this subscriber's monthly price was, for each month, looked up from the two histories.
     * Anything without a history line (data created outside the application) falls back to the
     * plan's current price.
     */
    public function scheduleFor(Subscriber $subscriber): RateSchedule
    {
        $plans = DB::table('subscriber_plan_history')->where('subscriber_id', $subscriber->subscriber_id)
            ->orderBy('effective_from')->get(['plan_id', 'effective_from'])->all();

        $planIds = array_unique(array_merge(array_map(fn ($r) => $r->plan_id, $plans), $subscriber->plan_id ? [$subscriber->plan_id] : []));
        $rates = $planIds === []
            ? []
            : DB::table('plan_rate_history')->whereIn('plan_id', $planIds)->orderBy('effective_from')->get(['plan_id', 'monthly_rate', 'effective_from'])->all();

        return new RateSchedule($plans, $rates, $subscriber->plan_id, (float) ($subscriber->plan->monthly_rate ?? 0));
    }
}
