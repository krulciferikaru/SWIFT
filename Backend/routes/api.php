<?php

use App\Http\Controllers\PlanController;
use App\Http\Controllers\SubscriberController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', fn () => response()->json([
    'status'  => 'ok',
    'system'  => 'SWIFT API',
    'version' => '1.0.0',
]));

// Temporary: auth:sanctum commented out for testing
// Route::middleware(['auth:sanctum'])->group(function () {

    // Subscriber Management
    Route::get('/subscribers/summary',               [SubscriberController::class, 'summary']);
    Route::patch('/subscribers/{subscriber}/status', [SubscriberController::class, 'updateStatus']);
    Route::apiResource('subscribers', SubscriberController::class);

    // Plan Management
    // Route::apiResource('plans', PlanController::class);

// });