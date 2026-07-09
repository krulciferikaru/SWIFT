<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subscriber\StoreSubscriberRequest;
use App\Http\Requests\Subscriber\UpdateSubscriberRequest;
use App\Models\Subscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriberController extends Controller
{
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
                'subscriber_id', 'plan_id', 'name', 'address',
                'contact_number', 'email', 'mac_address',
                'connection_date', 'status', 'created_at',
            ]);

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
            'payments' => fn ($q) => $q->latest('payment_date')->limit(12),
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
        $subscriber->update($request->validated());
        $subscriber->load('plan');

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
    public function destroy(int $id): JsonResponse
    {
        $subscriber = Subscriber::findOrFail($id);

        // Block deletion if subscriber has payment records
        if ($subscriber->payments()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete subscriber with existing payment records. Set status to Disconnected instead.',
            ], 422);
        }

        $subscriber->delete();

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
        $subscriber->update(['status' => $request->status]);

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
     * GET /api/subscribers/summary
     *
     * Returns a count breakdown by status.
     * Used for the admin dashboard stats cards.
     */
    public function summary(): JsonResponse
    {
        $summary = [
            'total'        => Subscriber::count(),
            'active'       => Subscriber::where('status', 'Active')->count(),
            'unpaid'       => Subscriber::where('status', 'Unpaid')->count(),
            'disconnected' => Subscriber::where('status', 'Disconnected')->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => $summary,
        ]);
    }
}
