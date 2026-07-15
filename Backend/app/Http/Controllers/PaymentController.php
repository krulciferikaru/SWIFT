<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Subscriber;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private BillingService $billing) {}

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

        $this->billing->recalculateStatus($subscriber->fresh());

        return response()->json([
            'success' => true,
            'message' => 'Payment recorded successfully.',
            'data' => [
                'payment' => $payment,
                'billing' => $this->billing->getBreakdown($subscriber->fresh()),
            ],
        ], 201);
    }
}