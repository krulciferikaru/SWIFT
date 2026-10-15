<?php

namespace App\Services;

use App\Models\Subscriber;
use Carbon\Carbon;
use Carbon\CarbonInterface;

class BillingService
{
    /**
     * Walks through every billing month from the month after connection_date to now,
     * allocating payments sequentially (oldest month first), carrying
     * partial payments and overpayment credit forward.
     *
     * Returns:
     * [
     *   'monthly_rate' => float,
     *   'months' => [
     *       ['label' => 'January 2026', 'due' => 1000.0, 'applied' => 1000.0, 'status' => 'paid'|'partial'|'unpaid'],
     *       ...
     *   ],
     *   'total_owed' => float,
     *   'total_paid' => float,
     *   'balance' => float,
     *   'months_behind' => int, // count of months not fully paid
     * ]
     */
    public function getBreakdown(Subscriber $subscriber, CarbonInterface|string|null $asOf = null): array
    {
        $schedule = app(RateHistoryService::class)->scheduleFor($subscriber);

        // The installation month is not billed (the installation fee is separate);
        // the subscription starts the month after the installation date.
        $start = Carbon::parse($subscriber->connection_date)->startOfMonth()->addMonth();
        $cutoff = $asOf ? Carbon::parse($asOf) : Carbon::now();
        $now = $cutoff->copy()->startOfMonth();

        $months = [];
        $cursor = $start->copy();
        while ($cursor->lte($now)) {
            $months[] = [
                'label' => $cursor->format('F Y'),
                // What this month cost when it was billed: a later change of plan or price never touches it.
                'due' => $schedule->rateAt($cursor),
                'applied' => 0.0,
                'status' => 'unpaid',
                // Advance billing: the bill for this month went out on the statement date before it and was due the day before it began.
                'statement_date' => \App\Support\BillingCycle::statementDateFor($cursor)->toDateString(),
                'due_date' => \App\Support\BillingCycle::dueDateFor($cursor)->toDateString(),
            ];
            $cursor->addMonth();
        }

        $paymentsQuery = $subscriber->payments()
            ->orderBy('payment_date')
            ->orderBy('id');

        if ($asOf) {
            $paymentsQuery->whereDate('payment_date', '<=', $cutoff->toDateString());
        }

        $payments = $paymentsQuery->get();

        $pool = (float) $payments->sum('amount');

        foreach ($months as &$month) {
            if ($pool <= 0) {
                break;
            }

            $needed = $month['due'];
            $apply = min($pool, $needed);
            $month['applied'] = round($apply, 2);
            $pool -= $apply;

            if ($month['applied'] >= $needed - 0.01) {
                $month['status'] = 'paid';
            } elseif ($month['applied'] > 0) {
                $month['status'] = 'partial';
            }
        }
        unset($month);

        $totalOwed = round(array_sum(array_column($months, 'due')), 2);
        // The price now, for "monthly bill" displays.
        $rate = $schedule->rateAt($now);
        $totalPaid = round((float) $payments->sum('amount'), 2);
        $balance = round($totalOwed - $totalPaid, 2);
        $monthsBehind = count(array_filter($months, fn ($m) => $m['status'] !== 'paid'));

        // Grace days (none by default): this month's bill, due at the end of last month, is not held against the
        // subscriber until the grace days after its due date have passed.
        $grace = \App\Support\BillingCycle::graceDays();
        if ($grace > 0 && $months !== [] && $cutoff->day <= $grace && end($months)['status'] !== 'paid') {
            $monthsBehind = max($monthsBehind - 1, 0);
        }

        return [
            'monthly_rate' => $rate,
            'months' => $months,
            'total_owed' => $totalOwed,
            'total_paid' => $totalPaid,
            'balance' => max($balance, 0), // credit doesn't show as negative balance
            'advance_credit' => $balance < 0 ? abs($balance) : 0,
            'months_behind' => $monthsBehind,
        ];
    }

    /**
     * Where the company's billing calendar stands: the statement date, which month it bills, and the next
     * due date (today counts). It is the same for every subscriber (see BillingCycle). Dates follow
     * Philippine time, where the subscribers are.
     *
     * @return array{statement_date: string, statement_issued: bool, covers: string, next_due_date: string, due_day: int, grace_days: int}
     */
    public function nextDue(Subscriber $subscriber): array
    {
        return \App\Support\BillingCycle::today();
    }

    /**
     * The due date is the same for everyone: the last day of the month. True when that day is tomorrow and the
     * bill for next month (the one that statement billed) is not fully paid yet. Only subscribers whose first
     * billed month has arrived have a bill to remind about.
     */
    public function isDueTomorrow(Subscriber $subscriber): bool
    {
        $tomorrow = Carbon::tomorrow('Asia/Manila');

        if (! $tomorrow->isSameDay($tomorrow->copy()->endOfMonth())) {
            return false;
        }

        // As of the first day of next month, the bill that is due tomorrow is the newest month on the list.
        $nextMonth = $tomorrow->copy()->addDay();
        $breakdown = $this->getBreakdown($subscriber, $nextMonth);
        $bill = collect($breakdown['months'])->firstWhere('label', $nextMonth->format('F Y'));

        return $bill && $bill['status'] !== 'paid';
    }

    /**
     * Recomputes and persists the subscriber's status based on months_behind.
     * Never auto-changes a subscriber OUT of 'Disconnected' — that requires
     * manual staff action (simulating a technician reconnecting the line).
     */
    public function recalculateStatus(Subscriber $subscriber): void
    {
        if ($subscriber->status === 'Disconnected') {
            return;
        }

        $breakdown = $this->getBreakdown($subscriber);
        $behind = $breakdown['months_behind'];

        $newStatus = match (true) {
            $behind >= 3 => 'Disconnected',
            $behind >= 1 => 'Unpaid',
            default => 'Active',
        };

        if ($newStatus !== $subscriber->status) {
            // The system, not a person, is changing it: the history says so.
            StatusHistoryService::$source = 'automatic';
            try {
                $subscriber->update(['status' => $newStatus]);
            } finally {
                StatusHistoryService::$source = null;
            }
        }
    }
}