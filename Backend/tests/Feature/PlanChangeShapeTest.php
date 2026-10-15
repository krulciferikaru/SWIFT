<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use App\Services\PlanChangeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlanChangeShapeTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_subscriber_list_carries_the_waiting_change_in_the_shape_the_screen_reads(): void
    {
        config(['ratelimit.enabled' => false]);
        Http::fake(['*' => Http::response(['status' => 'success'])]);
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));

        $basic = Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 800, 'speed_mbps' => 10, 'status' => 'Active']);
        $big = Plan::create(['plan_name' => 'Big', 'monthly_rate' => 1300, 'speed_mbps' => 20, 'status' => 'Active']);
        $sub = Subscriber::create([
            'plan_id' => $basic->plan_id, 'name' => 'Ana Cruz', 'contact_number' => '09171112222',
            'connection_date' => '2026-07-10', 'account_status' => 'active', 'status' => 'Active',
        ]);
        Payment::create(['subscriber_id' => $sub->subscriber_id, 'amount' => 2400, 'payment_date' => '2026-10-01', 'or_number' => 'OR1', 'payment_method' => 'Cash']);
        $admin = User::findOrFail(DB::table('users')->insertGetId([
            'name' => 'Admin', 'email' => 'a@p.test', 'password' => bcrypt('x'), 'role' => 'admin',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]));
        Sanctum::actingAs($admin);
        $this->postJson("/api/subscribers/{$sub->subscriber_id}/plan-change", ['plan_id' => $big->plan_id])->assertCreated();

        $row = collect($this->getJson('/api/subscribers')->assertOk()->json('data.data'))->firstWhere('subscriber_id', $sub->subscriber_id);
        $this->assertSame('Basic', $row['pending_plan_change']['from_plan']);
        $this->assertSame('Big', $row['pending_plan_change']['to_plan']);
        $this->assertFalse($row['pending_plan_change']['ready']);
        $this->assertNotEmpty($row['pending_plan_change']['expected_from']);
    }
}
