<?php

use App\Http\Controllers\ArchiveController;
use App\Http\Controllers\AuditLogController;
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

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

/*
 * Staff routes are guarded by permission (config/permissions.php), not by role name, so an
 * admin can switch individual abilities on or off for each secretary. Admins hold them all.
 */
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/me/billing', [PaymentController::class, 'myBilling']);
    Route::get('/me/payments', [PaymentController::class, 'myPayments']);

    // Plans are reference data that every signed-in role reads.
    Route::get('/plans', [PlanController::class, 'index'])
        ->middleware('role:admin,secretary,subscriber');
    Route::get('/plans/{plan}', [PlanController::class, 'show'])
        ->middleware('role:admin,secretary,subscriber');

    // Dashboard counts: any staff member.
    Route::get('/subscribers/summary', [SubscriberController::class, 'summary'])
        ->middleware('role:admin,secretary');

    Route::middleware('permission:reports.view')->group(function () {
        Route::get('/reports/subscribers', [ReportController::class, 'subscribers'])
            ->middleware('throttle:report-exports');
        Route::get('/reports/subscribers/xlsx', [ReportController::class, 'subscribersXlsx'])
            ->middleware('throttle:report-exports');
        Route::get('/reports/collections', [ReportController::class, 'collections'])
            ->middleware('throttle:reports');
        Route::get('/reports/collections/pdf', [ReportController::class, 'collectionsPdf'])
            ->middleware('throttle:report-exports');
        Route::get('/reports/collections/xlsx', [ReportController::class, 'collectionsXlsx'])
            ->middleware('throttle:report-exports');
        Route::get('/reports/financial-statement', [ReportController::class, 'financialStatement'])
            ->middleware('throttle:reports');
        Route::get('/reports/financial-statement/pdf', [ReportController::class, 'financialStatementPdf'])
            ->middleware('throttle:report-exports');
        Route::get('/reports/financial-statement/xlsx', [ReportController::class, 'financialStatementXlsx'])
            ->middleware('throttle:report-exports');
        Route::get('/reports/financial-summary', [PaymentController::class, 'financialSummary']);
    });

    Route::middleware('permission:approvals.manage')->group(function () {
        Route::get('/subscribers/pending', [SubscriberApprovalController::class, 'pending']);
        Route::patch('/subscribers/{subscriber}/approve', [SubscriberApprovalController::class, 'approve']);
        Route::patch('/subscribers/{subscriber}/reject', [SubscriberApprovalController::class, 'reject']);
        Route::get('/subscribers/pending-claims', [SubscriberApprovalController::class, 'pendingClaims']);
        Route::patch('/subscribers/claims/{user}/approve', [SubscriberApprovalController::class, 'approveClaim']);
        Route::patch('/subscribers/claims/{user}/reject', [SubscriberApprovalController::class, 'rejectClaim']);
        Route::get('/subscribers/rejected-claims', [SubscriberApprovalController::class, 'rejectedClaims']);
    });

    Route::get('/subscribers/{subscriber}/billing', [PaymentController::class, 'billing'])
        ->middleware('permission:payments.view,payments.record,subscribers.view');
    Route::get('/subscribers/{subscriber}/payments', [PaymentController::class, 'index'])
        ->middleware('permission:payments.view,payments.record,subscribers.view');
    Route::post('/subscribers/{subscriber}/payments', [PaymentController::class, 'store'])
        ->middleware('permission:payments.record');

    Route::get('/subscribers/check-duplicate', [SubscriberController::class, 'checkDuplicate'])
        ->middleware('permission:subscribers.manage');

    Route::post('/subscribers/send-reminders', [SubscriberController::class, 'sendReminders'])
        ->middleware('permission:sms.send', 'throttle:sms');
    Route::post('/sms/send', [SmsController::class, 'send'])
        ->middleware('permission:sms.send', 'throttle:sms');

    Route::middleware('permission:plans.manage')->group(function () {
        Route::post('/plans', [PlanController::class, 'store']);
        Route::put('/plans/{plan}', [PlanController::class, 'update']);
        Route::patch('/plans/{plan}', [PlanController::class, 'update']);
        Route::delete('/plans/{plan}', [PlanController::class, 'destroy']);
    });

    // Archive module: archived records can be restored or permanently deleted.
    Route::middleware('permission:archive.manage')->group(function () {
        Route::get('/archive/subscribers', [ArchiveController::class, 'subscribers']);
        Route::patch('/archive/subscribers/{id}/restore', [ArchiveController::class, 'restoreSubscriber']);
        Route::delete('/archive/subscribers/{id}', [ArchiveController::class, 'deleteSubscriber']);
        Route::get('/archive/plans', [ArchiveController::class, 'plans']);
        Route::patch('/archive/plans/{id}/restore', [ArchiveController::class, 'restorePlan']);
        Route::delete('/archive/plans/{id}', [ArchiveController::class, 'deletePlan']);
    });

    // The Payments page and the subscriber details window both need to look subscribers up.
    Route::get('/subscribers', [SubscriberController::class, 'index'])
        ->middleware('permission:subscribers.view,payments.view,payments.record');
    Route::get('/subscribers/{subscriber}', [SubscriberController::class, 'show'])
        ->middleware('permission:subscribers.view,payments.view,payments.record');
    Route::post('/subscribers', [SubscriberController::class, 'store'])
        ->middleware('permission:subscribers.manage');
    Route::put('/subscribers/{subscriber}', [SubscriberController::class, 'update'])
        ->middleware('permission:subscribers.manage');
    Route::patch('/subscribers/{subscriber}/status', [SubscriberController::class, 'updateStatus'])
        ->middleware('permission:subscribers.manage');
    Route::delete('/subscribers/{subscriber}', [SubscriberController::class, 'destroy'])
        ->middleware('permission:subscribers.archive');

    // Admin-only management.
    Route::middleware('permission:users.manage')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::patch('/users/{user}/status', [UserController::class, 'updateStatus']);
        Route::patch('/users/{user}/password', [UserController::class, 'resetPassword']);
        Route::get('/permissions', [UserController::class, 'permissionCatalog']);
        Route::patch('/users/{user}/permissions', [UserController::class, 'updatePermissions']);
    });

    Route::get('/audit-logs', [AuditLogController::class, 'index'])
        ->middleware('permission:audit.view');
});
