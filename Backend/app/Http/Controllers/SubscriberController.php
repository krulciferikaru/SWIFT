<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subscriber\StoreSubscriberRequest;
use App\Http\Requests\Subscriber\UpdateSubscriberRequest;
use App\Models\Subscriber;
use App\Services\BillingService;
use App\Services\PhilSmsService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriberController extends Controller
{
    private const STATUS_MESSAGES = [
        'Active' => 'Hi %s, your internet service is now Active. - Jubal Brothers Cable TV Corp - Palayan Branch',
        'Unpaid' => 'Hi %s, you currently have an unpaid balance. Please settle it to avoid disconnection. - Jubal Brothers Cable TV Corp - Palayan Branch',
        'Disconnected' => 'Hi %s, your internet service has been disconnected due to non-payment. Please contact us to reconnect. - Jubal Brothers Cable TV Corp - Palayan Branch',
    ];

    public function __construct(private PhilSmsService $sms, private BillingService $billing) {}

    /**
     * GET /api/subscribers
     *
     * Returns a paginated list of all subscribers.
     * Supports filtering by status and searching by name, email, address, MAC.
     *
     * Query params:
     *   ?search=john          → search by name / email / address / MAC
     *   ?status=Active        → filter by status (Active | Unpaid | Disconnected)
     *   ?plan_id=2            → filter by plan
     *   ?per_page=15          → results per page (default 15)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Subscriber::with('plan')
            ->select([
                'subscriber_id',
                'plan_id',
                'name',
                'address',
                'contact_number',
                'email',
                'mac_address',
                'connection_date',
                'status',
                'created_at',
                'account_status',
            ]);

        if ($request->filled('account_status')) {
            $query->where('account_status', $request->account_status);
        } else {
            $query->where('account_status', 'active');
        }

        // Search filter
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Plan filter
        if ($request->filled('plan_id')) {
            $query->where('plan_id', $request->plan_id);
        }

        $perPage = $request->integer('per_page', 15);
        $subscribers = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $subscribers,
        ]);
    }

    /**
     * POST /api/subscribers
     *
     * Creates a new subscriber record.
     * Only accessible by Admin and Secretary roles.
     */
    public function store(StoreSubscriberRequest $request): JsonResponse
    {
        $subscriber = Subscriber::create([
            ...$request->validated(),
            'account_status' => 'active',
            'status' => $request->input('status', 'Active'),
        ]);

        // Load the plan relationship for the response
        $subscriber->load('plan');

        return response()->json([
            'success' => true,
            'message' => 'Subscriber created successfully.',
            'data'    => $subscriber,
        ], 201);
    }

    /**
     * GET /api/subscribers/{subscriber}
     *
     * Returns a single subscriber with their plan and recent payment history.
     */
    public function show(int $id): JsonResponse
    {
        $subscriber = Subscriber::with([
            'plan',
            'payments' => fn($q) => $q->latest('payment_date')->limit(12),
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $subscriber,
        ]);
    }

    /**
     * PUT /api/subscribers/{subscriber}
     *
     * Updates an existing subscriber's details.
     * Only accessible by Admin and Secretary roles.
     */
    public function update(UpdateSubscriberRequest $request, int $id): JsonResponse
    {
        $subscriber = Subscriber::findOrFail($id);
        $previousStatus = $subscriber->status;

        $subscriber->update($request->validated());
        $subscriber->load('plan');

        $this->notifyStatusChange($subscriber, $previousStatus);

        return response()->json([
            'success' => true,
            'message' => 'Subscriber updated successfully.',
            'data'    => $subscriber,
        ]);
    }

    /**
     * DELETE /api/subscribers/{subscriber}
     *
     * Deletes a subscriber record.
     * Only accessible by Admin role.
     *
     * Note: This performs a hard delete. If the subscriber has payment history,
     * the foreign key constraint will block the deletion — handle this in
     * the React UI by warning the user first.
     */
    public function destroy(Subscriber $subscriber): JsonResponse
    {
        // Block deletion if subscriber has payment records.
        if ($subscriber->payments()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete subscriber with existing payment records. Set status to Disconnected instead.',
            ], 422);
        }

        try {
            $subscriber->delete();
        } catch (QueryException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to delete subscriber. It may be linked to other records.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Subscriber deleted successfully.',
        ]);
    }

    /**
     * PATCH /api/subscribers/{subscriber}/status
     *
     * Updates only the subscriber's status.
     * Useful for quick status changes from the masterlist table.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'in:Active,Unpaid,Disconnected'],
        ]);

        $subscriber = Subscriber::findOrFail($id);
        $previousStatus = $subscriber->status;
        $subscriber->update(['status' => $request->status]);

        $this->notifyStatusChange($subscriber, $previousStatus);

        return response()->json([
            'success' => true,
            'message' => "Subscriber status updated to {$request->status}.",
            'data'    => [
                'subscriber_id' => $subscriber->subscriber_id,
                'status'        => $subscriber->status,
            ],
        ]);
    }

    /**
     * Sends the subscriber an SMS when their status actually changed.
     */
    private function notifyStatusChange(Subscriber $subscriber, string $previousStatus): void
    {
        if ($subscriber->status !== $previousStatus && isset(self::STATUS_MESSAGES[$subscriber->status])) {
            $this->sms->sendToSubscriber($subscriber, sprintf(self::STATUS_MESSAGES[$subscriber->status], $subscriber->name));
        }
    }

    /**
     * POST /api/subscribers/send-reminders
     *
     * Sends a balance-reminder SMS to every currently Unpaid subscriber.
     * Manual, on-demand alternative to the daily due-date reminder job.
     */
    public function sendReminders(): JsonResponse
    {
        // Each SMS attempt is capped at ~10s by PhilSmsService, but sends run
        // sequentially — give the whole batch room to finish on hosts with a
        // stricter default execution limit than this box's unlimited one.
        set_time_limit(120);

        $sent = 0;
        $failed = 0;

        Subscriber::where('account_status', 'active')
            ->where('status', 'Unpaid')
            ->chunk(100, function ($subscribers) use (&$sent, &$failed) {
                foreach ($subscribers as $subscriber) {
                    $balance = $this->billing->getBreakdown($subscriber)['balance'];

                    $result = $this->sms->sendToSubscriber($subscriber, sprintf(
                        'Hi %s, this is a reminder that you have an outstanding balance of PHP %s. Please settle it as soon as possible to avoid service interruption. - Jubal Brothers Cable TV Corp - Palayan Branch',
                        $subscriber->name,
                        number_format((float) $balance, 2),
                    ));

                    $result['success'] ? $sent++ : $failed++;
                }
            });

        $message = "Sent payment reminders to {$sent} subscriber(s).";
        if ($failed > 0) {
            $message .= " {$failed} failed to send.";
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => ['sent' => $sent, 'failed' => $failed],
        ]);
    }

    /**
     * GET /api/subscribers/summary
     *
     * Returns a count breakdown by status.
     * Used for the admin dashboard stats cards.
     */
    public function summary(): JsonResponse
    {
        $baseQuery = Subscriber::query();

        $summary = [
            'pending'      => (clone $baseQuery)->where('account_status', 'pending')->count(),
            'total'        => (clone $baseQuery)->where('account_status', 'active')->count(),
            'active'       => (clone $baseQuery)->where('account_status', 'active')->where('status', 'Active')->count(),
            'unpaid'       => (clone $baseQuery)->where('account_status', 'active')->where('status', 'Unpaid')->count(),
            'disconnected' => (clone $baseQuery)->where('account_status', 'active')->where('status', 'Disconnected')->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => $summary,
        ]);
    }

    /**
     * GET /api/subscribers/check-duplicate?name=...
     *
     * Returns any existing active subscribers with a similar name, so staff
     * can be warned before creating what might be an accidental duplicate.
     */
    public function checkDuplicate(Request $request): JsonResponse
    {
        $name = $request->string('name')->toString();

        if (strlen($name) < 3) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $matches = Subscriber::where('account_status', 'active')
            ->where('name', 'like', "%{$name}%")
            ->limit(5)
            ->get(['subscriber_id', 'name', 'email', 'contact_number', 'status']);

        return response()->json(['success' => true, 'data' => $matches]);
    }
}
