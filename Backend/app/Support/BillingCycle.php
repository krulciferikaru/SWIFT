<?php

namespace App\Support;

use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * The company's billing calendar, the same for every subscriber whatever day they were installed.
 *
 *  - Statement date (the cutoff): the 16th of every month (`billing.statement_day`).
 *  - A statement bills the NEXT month (advance billing): the one on 16 October bills November.
 *  - Due date: the last day of the month the statement is issued in (about 15 days later): 31 October.
 *  - A month counts as unpaid from the day after its due date, which is the 1st of that month
 *    (plus `billing.grace_days`, none by default). Three or more unpaid months is Disconnected.
 *
 * A change of plan or price starts with the first statement issued after it: made before the statement
 * date, it applies to next month's bill; made on or after it, next month's bill has already gone out,
 * so it applies a month later.
 */
class BillingCycle
{
    public static function statementDay(): int
    {
        return max(1, min(28, (int) config('billing.statement_day', 16)));
    }

    public static function graceDays(): int
    {
        return max(0, (int) config('billing.grace_days', 0));
    }

    /** The first day of the first month billed by a statement issued after `$on` (today counts as before the statement if it is earlier in the month). */
    public static function firstMonthOnNextStatement(CarbonInterface $on): Carbon
    {
        $month = Carbon::instance($on)->startOfMonth();

        return $on->day < self::statementDay() ? $month->addMonth() : $month->addMonths(2);
    }

    /** The day the statement for the given month (its first day) is issued: the statement day of the month before. */
    public static function statementDateFor(CarbonInterface $month): Carbon
    {
        return Carbon::instance($month)->startOfMonth()->subMonth()->day(self::statementDay());
    }

    /** The day the bill for the given month is due: the last day of the month before. */
    public static function dueDateFor(CarbonInterface $month): Carbon
    {
        return Carbon::instance($month)->startOfMonth()->subDay();
    }

    /**
     * Where the calendar stands today.
     *
     * @return array{statement_date: string, statement_issued: bool, covers: string, next_due_date: string, due_day: int, grace_days: int}
     */
    public static function today(?CarbonInterface $today = null): array
    {
        $today = Carbon::instance($today ?? Carbon::now('Asia/Manila'))->startOfDay();
        $statement = $today->copy()->day(self::statementDay());
        $due = $today->copy()->endOfMonth()->startOfDay();

        return [
            'statement_date' => $statement->toDateString(),
            'statement_issued' => $today->gte($statement),
            // The month the statement bills: next month.
            'covers' => $today->copy()->startOfMonth()->addMonth()->format('F Y'),
            'next_due_date' => $due->toDateString(),
            'due_day' => $due->day,
            'grace_days' => self::graceDays(),
        ];
    }
}
