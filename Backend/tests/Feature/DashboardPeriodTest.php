<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardPeriodTest extends TestCase
{
    use RefreshDatabase;

    private function staff(string $role = 'admin', ?array $permissions = null): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => uniqid().'@d.test', 'password' => 'x', 'role' => $role,
            'account_status' => 'active', 'permissions' => is_null($permissions) ? null : json_encode($permissions),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function pay(Subscriber $sub, string $date, float $amount): void
    {
        Payment::create([
            'subscriber_id' => $sub->subscriber_id, 'amount' => $amount, 'payment_date' => $date,
            'or_number' => uniqid('OR'), 'payment_method' => 'Cash',
        ]);
    }

    private function sub(string $name, string $createdAt): Subscriber
    {
        $s = Subscriber::create([
            'name' => $name, 'contact_number' => '0917'.random_int(1000000, 9999999),
            'account_status' => 'active', 'status' => 'Active',
        ]);
        $s->forceFill(['created_at' => $createdAt])->save();

        return $s;
    }

    public function test_each_period_only_counts_its_own_dates(): void
    {
        // Wednesday 14 Oct 2026, midday in Manila.
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
        $sub = $this->sub('Juan', '2026-01-02 00:00:00');
        $this->pay($sub, '2026-10-14', 500);   // today
        $this->pay($sub, '2026-10-02', 300);   // this month, not today
        $this->pay($sub, '2026-08-20', 200);   // last quarter, so only the year and all-time totals
        $this->pay($sub, '2026-02-10', 100);   // this year only
        $this->pay($sub, '2025-12-10', 50);    // last year
        Sanctum::actingAs($this->staff());

        $get = fn (string $p) => $this->getJson("/api/dashboard/period?period=$p")->assertOk()->json('data');

        $this->assertEquals(500.0, $get('day')['collected']);
        $this->assertEquals(800.0, $get('month')['collected']);
        $this->assertEquals(800.0, $get('quarter')['collected']);
        $this->assertEquals(1100.0, $get('year')['collected']);
        $this->assertEquals(1150.0, $get('all')['collected']);
        $this->assertSame(5, $get('all')['payments_count']);
        $this->assertNull($get('all')['previous_collected']);
    }

    public function test_it_compares_with_the_previous_period(): void
    {
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
        $sub = $this->sub('Juan', '2026-01-02 00:00:00');
        $this->pay($sub, '2026-10-05', 600);
        $this->pay($sub, '2026-09-05', 400);
        Sanctum::actingAs($this->staff());

        $month = $this->getJson('/api/dashboard/period?period=month')->json('data');

        $this->assertEquals(400.0, $month['previous_collected']);
        $this->assertEquals(50.0, $month['collected_change_pct']);
    }

    public function test_today_follows_philippine_time_not_utc(): void
    {
        // 03:00 on 14 Oct in Manila is still 13 Oct in UTC.
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(3, 0));
        $sub = $this->sub('Juan', '2026-01-02 00:00:00');
        $this->pay($sub, '2026-10-14', 250);
        Sanctum::actingAs($this->staff());

        $this->assertEquals(250.0, $this->getJson('/api/dashboard/period?period=day')->json('data.collected'));
    }

    public function test_it_counts_new_subscribers_in_the_period(): void
    {
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
        $this->sub('A', '2026-10-03 02:00:00');
        $this->sub('B', '2026-10-10 02:00:00');
        $this->sub('C', '2026-09-10 02:00:00');
        Sanctum::actingAs($this->staff());

        $data = $this->getJson('/api/dashboard/period?period=month')->json('data');
        $this->assertSame(2, $data['new_subscribers']);
        $this->assertSame(1, $data['previous_new_subscribers']);
    }

    public function test_money_is_hidden_without_the_reports_permission(): void
    {
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
        $sub = $this->sub('Juan', '2026-10-02 02:00:00');
        $this->pay($sub, '2026-10-05', 600);
        Sanctum::actingAs($this->staff('secretary', ['subscribers.view']));

        $data = $this->getJson('/api/dashboard/period?period=month')->assertOk()->json('data');

        $this->assertNull($data['collected']);
        $this->assertNull($data['payments_count']);
        $this->assertSame(1, $data['new_subscribers']);
    }

    public function test_it_rejects_unknown_periods_and_non_staff(): void
    {
        Sanctum::actingAs($this->staff());
        $this->getJson('/api/dashboard/period?period=week')->assertStatus(422);

        $id = DB::table('users')->insertGetId([
            'name' => 'S', 'email' => 's@d.test', 'password' => 'x', 'role' => 'subscriber',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);
        Sanctum::actingAs(User::findOrFail($id));
        $this->getJson('/api/dashboard/period?period=month')->assertForbidden();
    }
}
