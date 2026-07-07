<?php

namespace App\Http\Controllers;

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
        $plan->update($request->validated());

        return response()->json([
            'message' => 'Plan updated.',
            'plan' => $plan,
        ]);
    }

    public function destroy(Plan $plan)
    {
        $plan->delete();

        return response()->json(['message' => 'Plan deleted.']);
    }
}