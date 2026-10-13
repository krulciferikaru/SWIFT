<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'permission' => \App\Http\Middleware\CheckPermission::class,
            'password.confirmed' => \App\Http\Middleware\CheckPasswordConfirmed::class,
            'session.slide' => \App\Http\Middleware\SlideSession::class,
            'mfa.enrolled' => \App\Http\Middleware\EnsureMfaEnrolled::class,
            'account.active' => \App\Http\Middleware\EnsureAccountActive::class,
            'mfa.code' => \App\Http\Middleware\RequireMfaCode::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn(Request $request) => $request->is('api/*'),
        );

        // A record that is not there (removed, or an old link) says so in plain words, instead of leaking the
        // internal name of the model ("No query results for model [App\Models\Subscriber] 296").
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'That could not be found. It may have been removed.'], 404);
            }
        });
    })->create();
