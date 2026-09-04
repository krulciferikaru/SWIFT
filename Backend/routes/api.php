<?php

use App\Http\Controllers\PlanController;
use App\Http\Controllers\SubscriberController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\SubscriberApprovalController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SmsController;
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

    Route::get('/me/billing', [PaymentController::class, 'myBilling']);
    Route::get('/me/payments', [PaymentController::class, 'myPayments']);
    
    Route::get('/plans', [PlanController::class, 'index'])
        ->middleware('role:admin,secretary,subscriber');
    Route::get('/plans/{plan}', [PlanController::class, 'show'])
        ->middleware('role:admin,secretary,subscriber');

    Route::get('/subscribers/summary', [SubscriberController::class, 'summary'])
        ->middleware('role:admin,secretary');

    Route::get('/reports/subscribers', [ReportController::class, 'subscribers'])
        ->middleware('role:admin,secretary');
    Route::get('/reports/collections', [ReportController::class, 'collections'])
        ->middleware('role:admin,secretary');
    Route::get('/reports/collections/pdf', [ReportController::class, 'collectionsPdf'])
        ->middleware('role:admin,secretary');
    Route::get('/reports/collections/xlsx', [ReportController::class, 'collectionsXlsx'])
        ->middleware('role:admin,secretary');
    Route::get('/reports/financial-statement', [ReportController::class, 'financialStatement'])
        ->middleware('role:admin,secretary');
    Route::get('/reports/financial-statement/pdf', [ReportController::class, 'financialStatementPdf'])
        ->middleware('role:admin,secretary');
    Route::get('/reports/financial-statement/xlsx', [ReportController::class, 'financialStatementXlsx'])
        ->middleware('role:admin,secretary');

    // Secretary + Admin can approve/reject subscriber accounts.
    Route::middleware('role:admin,secretary')->group(function () {
        Route::get('/subscribers/pending', [SubscriberApprovalController::class, 'pending']);
        Route::patch('/subscribers/{subscriber}/approve', [SubscriberApprovalController::class, 'approve']);
        Route::patch('/subscribers/{subscriber}/reject', [SubscriberApprovalController::class, 'reject']);
        Route::get('/subscribers/pending-claims', [SubscriberApprovalController::class, 'pendingClaims']);
        Route::patch('/subscribers/claims/{user}/approve', [SubscriberApprovalController::class, 'approveClaim']);
        Route::patch('/subscribers/claims/{user}/reject', [SubscriberApprovalController::class, 'rejectClaim']);
        Route::get('/subscribers/rejected-claims', [SubscriberApprovalController::class, 'rejectedClaims']);
        Route::get('/subscribers/{subscriber}/billing', [PaymentController::class, 'billing']);
        Route::get('/subscribers/{subscriber}/payments', [PaymentController::class, 'index']);
        Route::post('/subscribers/{subscriber}/payments', [PaymentController::class, 'store']);
        Route::get('/subscribers/check-duplicate', [SubscriberController::class, 'checkDuplicate']);
        Route::get('/reports/financial-summary', [PaymentController::class, 'financialSummary']);
        Route::post('/sms/test', [SmsController::class, 'test']);
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
        ->middleware('role:admin,secretary');

    // Admin-only management.
    Route::middleware('role:admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::patch('/users/{user}/status', [UserController::class, 'updateStatus']);
        Route::apiResource('plans', PlanController::class)->except(['index', 'show']);
    });
});
