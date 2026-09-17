<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Subscriber;
use App\Services\BillingService;
use App\Services\PhilSmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class PaymentController extends Controller
{
    public function __construct(private BillingService $billing, private PhilSmsService $sms) {}

    /**
     * GET /api/subscribers/{subscriber}/billing
     * Returns the full computed breakdown (months, balance, status inputs).
     */
    public function billing(Subscriber $subscriber): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->billing->getBreakdown($subscriber),
        ]);
    }

    /**
     * GET /api/subscribers/{subscriber}/payments
     * Payment history for this subscriber.
     */
    public function index(Subscriber $subscriber): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $subscriber->payments()->orderByDesc('payment_date')->orderByDesc('id')->get(),
        ]);
    }

    /**
     * POST /api/subscribers/{subscriber}/payments
     */
    public function store(Request $request, Subscriber $subscriber): JsonResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_date' => ['required', 'date'],
            'or_number' => ['required', 'string', 'max:50'],
            'payment_method' => ['required', 'in:Cash,GCash,Others'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $payment = Payment::create([
            ...$validated,
            'subscriber_id' => $subscriber->subscriber_id,
            'recorded_by' => $request->user()->id,
        ]);

        $subscriber = $subscriber->fresh();
        $this->billing->recalculateStatus($subscriber);
        $breakdown = $this->billing->getBreakdown($subscriber);

        $this->sms->sendToSubscriber($subscriber, sprintf(
            'Hi %s, we received your payment of PHP %s (OR# %s) on %s. Your remaining balance is PHP %s. Thank you! - Jubal Brothers Cable TV Corp - Palayan Branch',
            $subscriber->name,
            number_format((float) $payment->amount, 2),
            $payment->or_number,
            $payment->payment_date->format('M d, Y'),
            number_format((float) $breakdown['balance'], 2),
        ));

        return response()->json([
            'success' => true,
            'message' => 'Payment recorded successfully.',
            'data' => [
                'payment' => $payment,
                'billing' => $breakdown,
            ],
        ], 201);
    }

    /**
     * GET /api/me/billing — the logged-in subscriber's own billing breakdown.
     */
    public function myBilling(Request $request): JsonResponse
    {
        $subscriberId = $request->user()->subscriber_id;

        if (!$subscriberId) {
            return response()->json(['success' => false, 'message' => 'No subscriber record linked to this account.'], 404);
        }

        $subscriber = Subscriber::findOrFail($subscriberId);

        return response()->json([
            'success' => true,
            'data' => $this->billing->getBreakdown($subscriber),
        ]);
    }

    /**
     * GET /api/me/payments — the logged-in subscriber's own payment history.
     */
    public function myPayments(Request $request): JsonResponse
    {
        $subscriberId = $request->user()->subscriber_id;

        if (!$subscriberId) {
            return response()->json(['success' => false, 'message' => 'No subscriber record linked to this account.'], 404);
        }

        $payments = Payment::where('subscriber_id', $subscriberId)
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->get();

        return response()->json(['success' => true, 'data' => $payments]);
    }
    /**
     * GET /api/reports/financial-summary
     * Lightweight dashboard-level financial snapshot.
     */
    public function financialSummary(): JsonResponse
    {
        $now = Carbon::now();

        $collectedThisMonth = Payment::whereYear('payment_date', $now->year)
            ->whereMonth('payment_date', $now->month)
            ->sum('amount');

        $totalOutstanding = 0;
        Subscriber::where('account_status', 'active')
            ->whereNotNull('plan_id')
            ->chunk(100, function ($subscribers) use (&$totalOutstanding) {
                foreach ($subscribers as $subscriber) {
                    $totalOutstanding += $this->billing->getBreakdown($subscriber)['balance'];
                }
            });

        // Revenue trend: last 6 months of collections, oldest first.
        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $collected = Payment::whereYear('payment_date', $month->year)
                ->whereMonth('payment_date', $month->month)
                ->sum('amount');

            $trend[] = [
                'label' => $month->format('M Y'),
                'collected' => round((float) $collected, 2),
            ];
        }

        $collectionRate = ($collectedThisMonth + $totalOutstanding) > 0
            ? round(($collectedThisMonth / ($collectedThisMonth + $totalOutstanding)) * 100, 1)
            : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'collected_this_month' => round((float) $collectedThisMonth, 2),
                'total_outstanding' => round($totalOutstanding, 2),
                'collection_rate' => $collectionRate,
                'trend' => $trend,
            ],
        ]);
    }
}
