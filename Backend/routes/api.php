<?php

use App\Http\Controllers\PlanController;
use App\Http\Controllers\SubscriberController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\SubscriberApprovalController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', fn() => response()->json([
    'status'  => 'ok',
    'system'  => 'SWIFT API',
    'version' => '1.0.0',
]));

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/plans', [PlanController::class, 'index'])
        ->middleware('role:admin,secretary,subscriber');
    Route::get('/plans/{plan}', [PlanController::class, 'show'])
        ->middleware('role:admin,secretary,subscriber');

    Route::get('/subscribers/summary', [SubscriberController::class, 'summary'])
        ->middleware('role:admin,secretary');

    Route::get('/reports/subscribers', [ReportController::class, 'subscribers'])
        ->middleware('role:admin,secretary');

    // Secretary + Admin can approve/reject subscriber accounts.
    Route::middleware('role:admin,secretary')->group(function () {
        Route::get('/subscribers/pending', [SubscriberApprovalController::class, 'pending']);
        Route::patch('/subscribers/{subscriber}/approve', [SubscriberApprovalController::class, 'approve']);
        Route::patch('/subscribers/{subscriber}/reject', [SubscriberApprovalController::class, 'reject']);
        Route::get('/subscribers/pending-claims', [SubscriberApprovalController::class, 'pendingClaims']);
        Route::patch('/subscribers/claims/{user}/approve', [SubscriberApprovalController::class, 'approveClaim']);
        Route::patch('/subscribers/claims/{user}/reject', [SubscriberApprovalController::class, 'rejectClaim']);
    });

    Route::get('/subscribers', [SubscriberController::class, 'index'])
        ->middleware('role:admin,secretary');
    Route::post('/subscribers', [SubscriberController::class, 'store'])
        ->middleware('role:admin,secretary');
    Route::get('/subscribers/{subscriber}', [SubscriberController::class, 'show'])
        ->middleware('role:admin,secretary');
    Route::put('/subscribers/{subscriber}', [SubscriberController::class, 'update'])
        ->middleware('role:admin,secretary');
    Route::patch('/subscribers/{subscriber}/status', [SubscriberController::class, 'updateStatus'])
        ->middleware('role:admin,secretary');
    Route::delete('/subscribers/{subscriber}', [SubscriberController::class, 'destroy'])
        ->middleware('role:admin');

    // Admin-only management.
    Route::middleware('role:admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::patch('/users/{user}/role', [UserController::class, 'updateRole']);
        Route::patch('/users/{user}/status', [UserController::class, 'updateStatus']);
        Route::apiResource('plans', PlanController::class)->except(['index', 'show']);
    });
});
