<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Subscriber;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private const TIMEZONE = 'Asia/Manila';

    /**
     * GET /api/dashboard/period?period=day|month|quarter|year|all
     *
     * Activity within a period: money collected, payments recorded, and subscribers added,
     * compared with the period before it. Boundaries follow Philippine time, so "today"
     * does not flip at 8 AM. Money is only returned to staff who may view reports.
     *
     * Subscriber statuses (Active, Unpaid, Disconnected) and the outstanding balance are not
     * here on purpose: they only exist as of now, so they cannot be shown for a past period.
     */
    public function period(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => ['required', 'in:day,month,quarter,year,all'],
        ]);
        $period = $validated['period'];

        [$start, $end, $label] = $this->range($period);
        $previous = $this->previousRange($period, $start);

        $canSeeMoney = $request->user()->hasPermission('reports.view');

        $payments = fn (?Carbon $from, ?Carbon $to) => Payment::query()
            ->when($from, fn ($q) => $q->whereDate('payment_date', '>=', $from->toDateString()))
            ->when($to, fn ($q) => $q->whereDate('payment_date', '<=', $to->toDateString()));

        $added = fn (?Carbon $from, ?Carbon $to) => Subscriber::query()
            ->where('account_status', 'active')
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from->copy()->utc()))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to->copy()->utc()));

        $collected = $canSeeMoney ? round((float) $payments($start, $end)->sum('amount'), 2) : null;
        $previousCollected = ($canSeeMoney && $previous)
            ? round((float) $payments($previous[0], $previous[1])->sum('amount'), 2)
            : null;

        $changePct = null;
        if ($collected !== null && $previousCollected !== null && $previousCollected > 0) {
            $changePct = round((($collected - $previousCollected) / $previousCollected) * 100, 1);
        }

        $newSubscribers = $added($start, $end)->count();
        $previousNew = $previous ? $added($previous[0], $previous[1])->count() : null;

        return response()->json([
            'success' => true,
            'data' => [
                'period' => $period,
                'label' => $label,
                'from' => $start?->toDateString(),
                'to' => $end?->toDateString(),
                'collected' => $collected,
                'previous_collected' => $previousCollected,
                'collected_change_pct' => $changePct,
                'payments_count' => $canSeeMoney ? $payments($start, $end)->count() : null,
                'new_subscribers' => $newSubscribers,
                'previous_new_subscribers' => $previousNew,
            ],
        ]);
    }

    /** @return array{0: ?Carbon, 1: ?Carbon, 2: string} */
    private function range(string $period): array
    {
        $now = Carbon::now(self::TIMEZONE);

        return match ($period) {
            'day' => [$now->copy()->startOfDay(), $now->copy()->endOfDay(), $now->format('F j, Y')],
            'month' => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth(), $now->format('F Y')],
            'quarter' => [
                $now->copy()->startOfQuarter(),
                $now->copy()->endOfQuarter(),
                'Q'.$now->quarter.' '.$now->year,
            ],
            'year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear(), (string) $now->year],
            default => [null, null, 'All time'],
        };
    }

    /** @return array{0: Carbon, 1: Carbon}|null  the period just before, or null for "all" */
    private function previousRange(string $period, ?Carbon $start): ?array
    {
        if (! $start) {
            return null;
        }

        $prevStart = match ($period) {
            'day' => $start->copy()->subDay(),
            'month' => $start->copy()->subMonthNoOverflow(),
            'quarter' => $start->copy()->subQuarterNoOverflow(),
            'year' => $start->copy()->subYear(),
        };

        $prevEnd = match ($period) {
            'day' => $prevStart->copy()->endOfDay(),
            'month' => $prevStart->copy()->endOfMonth(),
            'quarter' => $prevStart->copy()->endOfQuarter(),
            'year' => $prevStart->copy()->endOfYear(),
        };

        return [$prevStart, $prevEnd];
    }
}
