<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportRateLimitTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): void
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Report Admin',
            'email' => 'report-admin@example.test',
            'password' => 'not-a-real-hash',
            'role' => 'admin',
            'account_status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Sanctum::actingAs(User::findOrFail($id));
    }

    public function test_switching_report_views_many_times_is_not_rate_limited(): void
    {
        $this->actingAsAdmin();

        // Each period switch loads two views; a handful of quick clicks used to hit the old
        // limit of 15 per minute.
        for ($i = 1; $i <= 40; $i++) {
            $status = $this->getJson('/api/reports/collections?range=monthly&month=2026-10')->getStatusCode();
            $this->assertNotSame(429, $status, "view request #{$i} was rate limited");
        }
    }

    public function test_file_exports_stay_on_the_stricter_limit(): void
    {
        $this->actingAsAdmin();

        for ($i = 1; $i <= 15; $i++) {
            $status = $this->get('/api/reports/subscribers')->getStatusCode();
            $this->assertNotSame(429, $status, "export #{$i} was rate limited too early");
        }

        $this->get('/api/reports/subscribers')->assertStatus(429);
    }

    public function test_exports_and_views_use_separate_buckets(): void
    {
        $this->actingAsAdmin();

        for ($i = 1; $i <= 16; $i++) {
            $this->get('/api/reports/subscribers');
        }

        // Exports are now exhausted, but looking at a report on screen still works.
        $status = $this->getJson('/api/reports/collections?range=monthly&month=2026-10')->getStatusCode();
        $this->assertNotSame(429, $status);
    }
}
