<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Subscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ArchiveController extends Controller
{
    public function subscribers(Request $request): JsonResponse
    {
        $query = Subscriber::onlyTrashed()->with('plan');

        if ($request->filled('search')) {
            $query->search($request->string('search')->toString());
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderByDesc('deleted_at')->paginate($request->integer('per_page', 15)),
        ]);
    }

    public function restoreSubscriber(int $id): JsonResponse
    {
        Subscriber::onlyTrashed()->findOrFail($id)->restore();

        return response()->json(['success' => true, 'message' => 'Subscriber restored.']);
    }

    /**
     * Permanently deletes an archived subscriber. Their payment records and
     * linked login are removed with them (database cascade).
     */
    public function deleteSubscriber(int $id): JsonResponse
    {
        Subscriber::onlyTrashed()->findOrFail($id)->forceDelete();

        return response()->json(['success' => true, 'message' => 'Subscriber permanently deleted.']);
    }

    public function plans(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Plan::onlyTrashed()->orderByDesc('deleted_at')->get(),
        ]);
    }

    public function restorePlan(int $id): JsonResponse
    {
        Plan::onlyTrashed()->findOrFail($id)->restore();

        return response()->json(['success' => true, 'message' => 'Plan restored.']);
    }

    public function deletePlan(int $id): JsonResponse
    {
        $plan = Plan::onlyTrashed()->findOrFail($id);

        // Deleting would null out plan_id and zero their billing, so refuse.
        if ($plan->subscribers()->withTrashed()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'This plan is still assigned to subscribers (including archived ones) and cannot be permanently deleted.',
            ], 422);
        }

        $plan->forceDelete();

        return response()->json(['success' => true, 'message' => 'Plan permanently deleted.']);
    }
}
