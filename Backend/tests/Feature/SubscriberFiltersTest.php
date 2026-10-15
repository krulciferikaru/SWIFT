<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriberFiltersTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Admin', 'email' => uniqid().'@f.test', 'password' => 'x', 'role' => 'admin',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function sub(string $name, string $status, ?int $planId, string $installed): Subscriber
    {
        return Subscriber::create([
            'name' => $name, 'contact_number' => '0917'.random_int(1000000, 9999999),
            'account_status' => 'active', 'status' => $status, 'plan_id' => $planId,
            'connection_date' => $installed,
        ]);
    }

    private function names(string $query): array
    {
        return collect($this->getJson('/api/subscribers?'.$query)->assertOk()->json('data.data'))
            ->pluck('name')->sort()->values()->all();
    }

    public function test_the_list_can_be_narrowed_by_status_plan_and_installation_date(): void
    {
        $basic = Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 500, 'speed_mbps' => 10, 'status' => 'Active']);
        $fast = Plan::create(['plan_name' => 'Fast', 'monthly_rate' => 900, 'speed_mbps' => 50, 'status' => 'Active']);
        $this->sub('Ana', 'Active', $basic->plan_id, '2026-01-10');
        $this->sub('Ben', 'Unpaid', $basic->plan_id, '2026-03-05');
        $this->sub('Cara', 'Unpaid', $fast->plan_id, '2026-06-20');
        $this->sub('Dino', 'Disconnected', $fast->plan_id, '2025-11-30');
        Sanctum::actingAs($this->admin());

        $this->assertSame(['Ben', 'Cara'], $this->names('status=Unpaid'));
        $this->assertSame(['Ben'], $this->names('status=Unpaid&plan_id='.$basic->plan_id));
        $this->assertSame(['Ana', 'Ben'], $this->names('installed_from=2026-01-01&installed_to=2026-03-31'));
        $this->assertSame(['Cara', 'Dino'], $this->names('plan_id='.$fast->plan_id));
        $this->assertSame(['Ana', 'Ben', 'Cara'], $this->names('installed_from=2026-01-01'));
        $this->assertSame(['Dino'], $this->names('installed_to=2025-12-31'));
    }

    /** @return list<string> names in the order the server returned them */
    private function orderedNames(string $query): array
    {
        return collect($this->getJson('/api/subscribers?'.$query)->assertOk()->json('data.data'))->pluck('name')->all();
    }

    public function test_the_list_can_be_sorted_by_the_columns_on_offer(): void
    {
        $basic = Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 500, 'speed_mbps' => 10, 'status' => 'Active']);
        $fast = Plan::create(['plan_name' => 'Fast', 'monthly_rate' => 900, 'speed_mbps' => 50, 'status' => 'Active']);
        $this->sub('Ana', 'Unpaid', $fast->plan_id, '2026-01-10');
        $this->sub('Ben', 'Active', $basic->plan_id, '2026-03-05');
        $this->sub('Cara', 'Disconnected', $basic->plan_id, '2025-06-20');
        Sanctum::actingAs($this->admin());

        $this->assertSame(['Ana', 'Ben', 'Cara'], $this->orderedNames(''));                          // name by default
        $this->assertSame(['Cara', 'Ben', 'Ana'], $this->orderedNames('sort=name&direction=desc'));
        $this->assertSame(['Cara', 'Ana', 'Ben'], $this->orderedNames('sort=installed&direction=asc'));
        $this->assertSame(['Ben', 'Ana', 'Cara'], $this->orderedNames('sort=installed&direction=desc'));
        $this->assertSame(['Ben', 'Cara', 'Ana'], $this->orderedNames('sort=plan&direction=asc'));     // Basic, Basic, Fast (ties by name)
        $this->assertSame(['Ana', 'Ben', 'Cara'], $this->orderedNames('sort=plan&direction=desc'));
        $this->assertSame(['Ben', 'Cara', 'Ana'], $this->orderedNames('sort=status&direction=asc'));   // Active, Disconnected, Unpaid
        $this->assertSame(['Ana', 'Ben', 'Cara'], $this->orderedNames('sort=password&direction=desc')); // unknown columns are ignored
    }

    public function test_the_page_size_is_capped(): void
    {
        $this->sub('Ana', 'Active', null, '2026-01-10');
        Sanctum::actingAs($this->admin());

        $this->assertSame(100, $this->getJson('/api/subscribers?per_page=5000')->json('data.per_page'));
        $this->assertSame(1, $this->getJson('/api/subscribers?per_page=0')->json('data.per_page'));
    }

    public function test_balances_are_added_on_request(): void
    {
        $plan = Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 500, 'speed_mbps' => 10, 'status' => 'Active']);
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
        // Installed in July: billed for August, September and October = 1500.
        $this->sub('Ana', 'Unpaid', $plan->plan_id, '2026-07-10');
        Sanctum::actingAs($this->admin());

        $plain = $this->getJson('/api/subscribers')->assertOk()->json('data.data.0');
        $this->assertArrayNotHasKey('balance', $plain);

        $row = $this->getJson('/api/subscribers?with_balance=1')->assertOk()->json('data.data.0');
        $this->assertEquals(1500.0, $row['balance']);
        $this->assertSame(3, $row['months_behind']);
    }

    public function test_the_installation_range_must_make_sense(): void
    {
        Sanctum::actingAs($this->admin());

        $this->getJson('/api/subscribers?installed_from=2026-05-01&installed_to=2026-04-01')->assertStatus(422);
        $this->getJson('/api/subscribers?installed_from=nope')->assertStatus(422);
    }

    public function test_the_exports_use_the_same_filters(): void
    {
        $this->sub('Ana', 'Active', null, '2026-01-10');
        $this->sub('Ben', 'Active', null, '2026-08-05');
        Sanctum::actingAs($this->admin());

        $csv = $this->get('/api/reports/subscribers?installed_from=2026-07-01')->assertOk()->streamedContent();

        $this->assertStringContainsString('Ben', $csv);
        $this->assertStringNotContainsString('Ana', $csv);
    }
}
