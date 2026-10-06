<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $enabled = config('ratelimit.enabled');

        RateLimiter::for('login', fn (Request $request) => $enabled
            ? Limit::perMinute(config('ratelimit.login'))->by(strtolower((string) $request->input('email')) . '|' . $request->ip())
            : Limit::none()
        );

        RateLimiter::for('register', fn (Request $request) => $enabled
            ? Limit::perHour(config('ratelimit.register'))->by($request->ip())
            : Limit::none()
        );

        RateLimiter::for('sms', fn (Request $request) => $enabled
            ? Limit::perMinute(config('ratelimit.sms'))->by($request->user()?->id ?: $request->ip())
            : Limit::none()
        );

        RateLimiter::for('reports', fn (Request $request) => $enabled
            ? Limit::perMinute(config('ratelimit.reports'))->by($request->user()?->id ?: $request->ip())
            : Limit::none()
        );
    }
}
