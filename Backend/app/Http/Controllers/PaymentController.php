<?php

namespace App\Http\Controllers;

use App\Services\Audit;
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
            'data' => $subscriber->payments()->withoutGlobalScope(Payment::NOT_VOIDED)->with(['recordedBy:id,name', 'voidedBy:id,name'])->orderByDesc('payment_date')->orderByDesc('id')->get(),
        ]);
    }

    /**
     * GET /api/payments/next-or-number
     *
     * Official receipt books are numbered in order, so the number after the last one this person
     * recorded is usually the next one. It is only a suggestion: the person can type another.
     * Returns null when there is nothing to go on (their first payment) or the last number has
     * no digits at the end.
     */
    public function nextOrNumber(Request $request): JsonResponse
    {
        $last = Payment::withVoided()->where('recorded_by', $request->user()->id)->orderByDesc('id')->value('or_number');

        return response()->json([
            'success' => true,
            'data' => ['suggestion' => $last ? $this->followingOrNumber($last) : null],
        ]);
    }

    /** "OR-00041" -> "OR-00042": keeps the prefix and the zero padding, and skips numbers already used. */
    private function followingOrNumber(string $last): ?string
    {
        if (! preg_match('/^(.*?)(\d+)$/', trim($last), $parts)) {
            return null;
        }
        [, $prefix, $digits] = $parts;

        for ($step = 1; $step <= 50; $step++) {
            $candidate = $prefix.str_pad((string) ((int) $digits + $step), strlen($digits), '0', STR_PAD_LEFT);
            // A cancelled receipt number is still used up: that paper receipt exists.
            if (! Payment::withVoided()->where('or_number', $candidate)->exists()) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * POST /api/payments/{id}/void  { reason }   (administrators, and asks for their password)
     *
     * How a mistake is put right without touching the record: the payment is cancelled, with who,
     * when and why, and stays in the history. It stops counting towards the balance, the
     * reports and the totals at once, and the subscriber's status is worked out again. The correct
     * payment is then recorded as a new one.
     */
    public function void(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:255'],
        ], [
            'reason.required' => 'Say why the payment is being cancelled.',
            'reason.min' => 'Say a little more about why (at least 5 characters).',
        ]);

        $payment = Payment::withVoided()->findOrFail($id);
        if ($payment->voided_at) {
            return response()->json(['message' => 'This payment was already cancelled.'], 422);
        }

        $payment->forceFill([
            'voided_at' => now(),
            'voided_by' => $request->user()->id,
            'void_reason' => trim($validated['reason']),
        ])->save();

        $subscriber = Subscriber::withTrashed()->find($payment->subscriber_id);
        Audit::log('payment.voided', $subscriber, null, [
            'amount' => (float) $payment->amount,
            'or_number' => $payment->or_number,
            'payment_date' => $payment->payment_date?->toDateString(),
            'reason' => $payment->void_reason,
        ]);

        $billing = null;
        if ($subscriber && ! $subscriber->trashed()) {
            $this->billing->recalculateStatus($subscriber->fresh());
            $billing = $this->billing->getBreakdown($subscriber->fresh());
        }

        return response()->json([
            'success' => true,
            'message' => 'The payment was cancelled. It stays in the history, and the balance was worked out again.',
            'data' => ['payment' => $payment->fresh(['recordedBy', 'voidedBy']), 'billing' => $billing],
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
            // One of the methods an admin has switched on (Settings, Payment methods).
            'payment_method' => ['required', \Illuminate\Validation\Rule::exists('payment_methods', 'name')->where('is_active', true)],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [
            'payment_method.exists' => 'Choose one of the available payment methods.',
        ]);

        $payment = Payment::create([
            ...$validated,
            'subscriber_id' => $subscriber->subscriber_id,
            'recorded_by' => $request->user()->id,
        ]);

        Audit::log('payment.recorded', $subscriber, null, [
            'amount' => (float) $payment->amount,
            'or_number' => $payment->or_number,
            'method' => $payment->payment_method,
            'payment_date' => $validated['payment_date'],
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
    /** GET /api/me/status-history: the subscriber's own service history (they have a right to it). */
    public function myStatusHistory(Request $request): JsonResponse
    {
        $subscriber = $request->user()->subscriber_id ? Subscriber::find($request->user()->subscriber_id) : null;
        if (! $subscriber) {
            return response()->json(['success' => false, 'message' => 'No subscriber record linked to this account.'], 404);
        }

        return response()->json(['success' => true, 'data' => app(\App\Services\StatusHistoryService::class)->timeline($subscriber, forStaff: false)]);
    }

    public function myBilling(Request $request): JsonResponse
    {
        $subscriberId = $request->user()->subscriber_id;

        if (!$subscriberId) {
            return response()->json(['success' => false, 'message' => 'No subscriber record linked to this account.'], 404);
        }

        $subscriber = Subscriber::with('plan')->findOrFail($subscriberId);

        return response()->json([
            'success' => true,
            'data' => [
                ...$this->billing->getBreakdown($subscriber),
                // What the subscriber's account is called right now, in the words staff see.
                'status' => $subscriber->status,
                'plan_name' => $subscriber->plan?->plan_name,
                ...$this->billing->nextDue($subscriber),
            ],
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

        $payments = Payment::withVoided()->with(['recordedBy:id,name', 'voidedBy:id,name'])->where('subscriber_id', $subscriberId)
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->get();

        $subscriber = Subscriber::with('plan')->find($subscriberId);

        return response()->json([
            'success' => true,
            'data' => $payments,
            // What a printed receipt needs to say who it is for.
            'subscriber' => $subscriber ? [
                'name' => $subscriber->name,
                'address' => $subscriber->address,
                'contact_number' => $subscriber->contact_number,
                'plan_name' => $subscriber->plan?->plan_name,
            ] : null,
        ]);
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
