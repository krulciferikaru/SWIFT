<?php

use App\Http\Controllers\PlanController;
use App\Http\Controllers\SubscriberController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\SubscriberApprovalController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', fn () => response()->json([
    'status'  => 'ok',
    'system'  => 'SWIFT API',
    'version' => '1.0.0',
]));

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Secretary WSW+ Admin can approve/reject subscribers
    Route::middleware('role:admin,secretary')->group(function () {
        Route::get('/subscribers/pending', [SubscriberApprovalController::class, 'pending']);
        Route::patch('/subscribers/{user}/approve', [SubscriberApprovalController::class, 'approve']);
        Route::patch('/subscribers/{user}/reject', [SubscriberApprovalController::class, 'reject']);
        Route::apiResource('plans', PlanController::class)->only(['index', 'show']);
    });

    // Admin-only: assign roles
    Route::middleware('role:admin')->group(function () {
        Route::patch('/users/{user}/role', function (\Illuminate\Http\Request $request, \App\Models\User $user) {
            $request->validate(['role' => 'required|in:admin,secretary,subscriber']);
            $user->update(['role' => $request->role]);
            return response()->json(['message' => 'Role updated.', 'user' => $user]);
        });
    });
});
// Temporary: auth:sanctum commented out for testing
// Route::middleware(['auth:sanctum'])->group(function () {

    // Subscriber Management
    Route::get('/subscribers/summary',               [SubscriberController::class, 'summary']);
    Route::patch('/subscribers/{subscriber}/status', [SubscriberController::class, 'updateStatus']);
    Route::apiResource('subscribers', SubscriberController::class);

    // Plan Management
    // Route::apiResource('plans', PlanController::class);

// });