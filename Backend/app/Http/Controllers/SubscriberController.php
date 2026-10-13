<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use App\Http\Controllers\Controller;
use App\Http\Requests\Subscriber\StoreSubscriberRequest;
use App\Http\Requests\Subscriber\UpdateSubscriberRequest;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use App\Services\BillingService;
use App\Services\PhilSmsService;
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
     *   ?per_page=15          → results per page (default 15, at most 100)
     *   ?sort=name|status|plan|installed|created&direction=asc|desc
     *   ?with_balance=1       → also return each person's balance and months behind
     */
    public function index(Request $request): JsonResponse
    {
        $query = Subscriber::with(['plan', 'user:id,subscriber_id,contact_number,contact_verified_at'])
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

        // Installation date range
        $request->validate([
            'installed_from' => ['nullable', 'date_format:Y-m-d'],
            'installed_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:installed_from'],
        ]);
        $query->installedBetween($request->input('installed_from'), $request->input('installed_to'));

        // Sorting: only these columns, so nothing else can be asked for.
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $sort = (string) $request->input('sort');
        $sortColumns = ['name' => 'name', 'status' => 'status', 'installed' => 'connection_date', 'created' => 'created_at'];
        if ($sort === 'plan') {
            $query->orderBy(
                Plan::query()->select('plan_name')->whereColumn('plan.plan_id', 'subscriber.plan_id')->limit(1),
                $direction,
            );
        } elseif (isset($sortColumns[$sort])) {
            $query->orderBy($sortColumns[$sort], $direction);
        }
        if ($sort !== 'name') {
            $query->orderBy('name'); // keeps the order steady between equal values
        }

        $perPage = min(max($request->integer('per_page', 15), 1), 100);
        $subscribers = $query->paginate($perPage);

        // What each person owes, for the people on this page only.
        if ($request->boolean('with_balance')) {
            $subscribers->getCollection()->transform(function (Subscriber $subscriber) {
                $owes = $subscriber->connection_date
                    ? $this->billing->getBreakdown($subscriber)
                    : ['balance' => 0, 'months_behind' => 0, 'advance_credit' => 0];
                $subscriber->setAttribute('balance', $owes['balance']);
                $subscriber->setAttribute('months_behind', $owes['months_behind']);
                $subscriber->setAttribute('advance_credit', $owes['advance_credit']);

                return $subscriber;
            });
        }

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

        Audit::log('subscriber.created', $subscriber);

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
            'user:id,subscriber_id,contact_number,contact_verified_at',
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
        $before = $subscriber->getOriginal();

        $subscriber->update($request->validated());
        $subscriber->load('plan');

        Audit::log('subscriber.updated', $subscriber, null, Audit::diff($before, $subscriber));

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
     * Archives the subscriber (soft delete) and signs out any linked login.
     * Permanent deletion lives in the Archive module.
     */
    public function destroy(Subscriber $subscriber): JsonResponse
    {
        User::where('subscriber_id', $subscriber->subscriber_id)->each(
            fn (User $user) => $user->tokens()->delete()
        );

        $subscriber->delete();

        Audit::log('subscriber.archived', $subscriber);

        return response()->json([
            'success' => true,
            'message' => 'Subscriber archived.',
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

        Audit::log('subscriber.status_changed', $subscriber, null, [
            'status' => ['old' => $previousStatus, 'new' => $subscriber->status],
        ]);

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
    public function sendReminders(Request $request): JsonResponse
    {
        // Optionally only to the people picked on the Subscribers page. Anyone picked who owes
        // nothing is skipped, so a reminder never goes to someone who is paid up.
        $request->validate([
            'subscriber_ids' => ['nullable', 'array', 'max:200'],
            'subscriber_ids.*' => ['integer'],
        ]);
        $pickedIds = $request->input('subscriber_ids');

        // Each SMS attempt is capped at ~10s by PhilSmsService, but sends run
        // sequentially — give the whole batch room to finish on hosts with a
        // stricter default execution limit than this box's unlimited one.
        set_time_limit(120);

        $sent = 0;
        $failed = 0;
        $skipped = 0;

        Subscriber::where('account_status', 'active')
            ->when($pickedIds === null, fn ($q) => $q->where('status', 'Unpaid'))
            ->when($pickedIds !== null, fn ($q) => $q->whereIn('subscriber_id', $pickedIds))
            ->chunk(100, function ($subscribers) use (&$sent, &$failed, &$skipped) {
                foreach ($subscribers as $subscriber) {
                    $balance = $this->billing->getBreakdown($subscriber)['balance'];
                    if ($balance <= 0) {
                        $skipped++;
                        continue;
                    }

                    $result = $this->sms->sendToSubscriber($subscriber, sprintf(
                        'Hi %s, this is a reminder that you have an outstanding balance of PHP %s. Please settle it as soon as possible to avoid service interruption. - Jubal Brothers Cable TV Corp - Palayan Branch',
                        $subscriber->name,
                        number_format((float) $balance, 2),
                    ));

                    $result['success'] ? $sent++ : $failed++;
                }
            });

        Audit::log(
            'sms.reminders_sent',
            null,
            $pickedIds === null ? 'Unpaid subscribers' : 'Selected subscribers',
            ['sent' => $sent, 'failed' => $failed, 'skipped' => $skipped],
        );

        $message = "Sent payment reminders to {$sent} subscriber(s).";
        if ($failed > 0) {
            $message .= " {$failed} failed to send.";
        }
        if ($skipped > 0) {
            $message .= " {$skipped} owe nothing, so they were skipped.";
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => ['sent' => $sent, 'failed' => $failed, 'skipped' => $skipped],
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
