<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use App\Http\Requests\Plan\StorePlanRequest;
use App\Http\Requests\Plan\UpdatePlanRequest;
use App\Models\Plan;

class PlanController extends Controller
{
    public function index()
    {
        return response()->json(Plan::all());
    }

    public function store(StorePlanRequest $request)
    {
        $plan = Plan::create($request->validated());

        Audit::log('plan.created', $plan);

        return response()->json([
            'message' => 'Plan created.',
            'plan' => $plan,
        ], 201);
    }

    public function show(Plan $plan)
    {
        return response()->json($plan);
    }

    public function update(UpdatePlanRequest $request, Plan $plan)
    {
        $before = $plan->getOriginal();
        $plan->update($request->validated());

        Audit::log('plan.updated', $plan, null, Audit::diff($before, $plan));

        return response()->json([
            'message' => 'Plan updated.',
            'plan' => $plan,
        ]);
    }

    /** Archives the plan (soft delete); permanent deletion lives in the Archive module. */
    public function destroy(Plan $plan)
    {
        $plan->delete();

        Audit::log('plan.archived', $plan);

        return response()->json(['message' => 'Plan archived.']);
    }
}