<?php

namespace App\Services;

use App\Models\Subscriber;
use Carbon\Carbon;
use Carbon\CarbonInterface;

class BillingService
{
    /**
     * Walks through every billing month from connection_date to now,
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
        $rate = (float) ($subscriber->plan->monthly_rate ?? 0);

        $start = Carbon::parse($subscriber->connection_date)->startOfMonth();
        $cutoff = $asOf ? Carbon::parse($asOf) : Carbon::now();
        $now = $cutoff->copy()->startOfMonth();

        $months = [];
        $cursor = $start->copy();
        while ($cursor->lte($now)) {
            $months[] = [
                'label' => $cursor->format('F Y'),
                'due' => $rate,
                'applied' => 0.0,
                'status' => 'unpaid',
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

        $totalOwed = round($rate * count($months), 2);
        $totalPaid = round((float) $payments->sum('amount'), 2);
        $balance = round($totalOwed - $totalPaid, 2);
        $monthsBehind = count(array_filter($months, fn ($m) => $m['status'] !== 'paid'));

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
            $subscriber->update(['status' => $newStatus]);
        }
    }
}