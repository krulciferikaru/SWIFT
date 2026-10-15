<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanChangeRequest;
use App\Models\Subscriber;
use App\Services\PlanChangeService;
use App\Support\BillingCycle;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Changing a subscriber's plan: request, confirm once it is carried out, or cancel. Never a plain edit. */
class PlanChangeController extends Controller
{
    public function __construct(private PlanChangeService $changes) {}

    /** POST /api/subscribers/{subscriber}/plan-change  { plan_id, reason? } */
    public function store(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plan,plan_id'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $change = $this->changes->request(
            Subscriber::findOrFail($id),
            Plan::withTrashed()->findOrFail($validated['plan_id']),
            $request->user(),
            $validated['reason'] ?? null,
        );

        return response()->json([
            'success' => true,
            'message' => 'Plan change requested. Confirm it once it has been carried out.',
            'data' => $this->present($change),
        ], 201);
    }

    /** POST /api/plan-changes/{id}/complete */
    public function complete(Request $request, int $id): JsonResponse
    {
        $change = $this->changes->complete(PlanChangeRequest::findOrFail($id), $request->user(), $request->boolean("early"));

        return response()->json([
            'success' => true,
            'message' => 'The plan was changed. The new price applies from '.$change->effective_from->format('F Y').'.',
            'data' => $this->present($change),
        ]);
    }

    /** POST /api/plan-changes/{id}/cancel */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $change = $this->changes->cancel(PlanChangeRequest::findOrFail($id), $request->user());

        return response()->json(['success' => true, 'message' => 'The plan change was cancelled.', 'data' => $this->present($change)]);
    }

    /** What the screens show for a request. `expected_from` is the first month billed at the new price if it were confirmed today. */
    public static function present(PlanChangeRequest $change): array
    {
        return [
            'id' => $change->id,
            'subscriber_id' => $change->subscriber_id,
            'status' => $change->status,
            'from_plan' => $change->fromPlan?->plan_name,
            'to_plan' => $change->toPlan?->plan_name,
            'to_rate' => $change->toPlan ? (float) $change->toPlan->monthly_rate : null,
            'reason' => $change->reason,
            'requested_at' => $change->requested_at?->toIso8601String(),
            'earliest_at' => $change->earliest_at?->toIso8601String(),
            'ready' => $change->isReady(),
            'effective_from' => $change->effective_from?->toDateString(),
            'expected_from' => $change->status === 'pending'
                ? BillingCycle::firstMonthOnNextStatement(Carbon::now('Asia/Manila'))->toDateString()
                : null,
        ];
    }
}
