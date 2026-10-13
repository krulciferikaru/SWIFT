<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use App\Services\BillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Changing a plan, or a plan's price, must never re-price a month that was already billed. */
class PlanChangeBillingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false, 'billing.plan_change_effective' => 'next_month']);
        Http::fake(['*' => Http::response(['status' => 'success'])]);
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
    }

    private function admin(): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Admin', 'email' => 'a'.uniqid().'@p.test', 'password' => bcrypt('x'), 'role' => 'admin',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function plan(string $name, float $rate): Plan
    {
        return Plan::create(['plan_name' => $name, 'monthly_rate' => $rate, 'speed_mbps' => 10, 'status' => 'Active']);
    }

    /** Installed 10 July 2026 on the given plan: billed for August, September and October. */
    private function subscriber(Plan $plan): Subscriber
    {
        return Subscriber::create([
            'plan_id' => $plan->plan_id, 'name' => 'Ana Cruz', 'contact_number' => '09171112222',
            'connection_date' => '2026-07-10', 'account_status' => 'active', 'status' => 'Unpaid',
        ]);
    }

    /** @return array<string, float> month label => what was due */
    private function dues(Subscriber $s): array
    {
        $months = app(BillingService::class)->getBreakdown($s->fresh())['months'];

        return collect($months)->pluck('due', 'label')->map(fn ($d) => (float) $d)->all();
    }

    private function change(Subscriber $s, array $data)
    {
        Sanctum::actingAs($this->admin());

        return $this->putJson("/api/subscribers/{$s->subscriber_id}", $data);
    }

    public function test_changing_the_plan_leaves_the_months_already_billed_alone(): void
    {
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $sub = $this->subscriber($basic);

        $this->change($sub, ['plan_id' => $big->plan_id])->assertOk();

        // August, September and this month (October) keep the old price: the change starts next month.
        $this->assertSame(['August 2026' => 800.0, 'September 2026' => 800.0, 'October 2026' => 800.0], $this->dues($sub));
        $this->assertSame(2400.0, (float) app(BillingService::class)->getBreakdown($sub->fresh())['balance']);

        // From next month the new plan applies.
        $this->travelTo(now('Asia/Manila')->setDate(2026, 11, 5)->setTime(12, 0));
        $this->assertSame(1300.0, $this->dues($sub)['November 2026']);
        $this->assertSame(800.0, $this->dues($sub)['October 2026']);
    }

    public function test_the_company_can_choose_that_a_change_starts_this_month(): void
    {
        config(['billing.plan_change_effective' => 'current_month']);
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $sub = $this->subscriber($basic);

        $this->change($sub, ['plan_id' => $big->plan_id])->assertOk();

        $this->assertSame(['August 2026' => 800.0, 'September 2026' => 800.0, 'October 2026' => 1300.0], $this->dues($sub));
    }

    public function test_staff_can_choose_the_month_it_starts_from_within_limits(): void
    {
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $sub = $this->subscriber($basic);

        // Before the first month billed (July is the installation month, so August is the first): refused.
        $this->change($sub, ['plan_id' => $big->plan_id, 'plan_effective_from' => '2026-07-01'])
            ->assertStatus(422)->assertJsonValidationErrors('plan_effective_from');
        // More than a month ahead: refused.
        $this->change($sub, ['plan_id' => $big->plan_id, 'plan_effective_from' => '2026-12-01'])->assertStatus(422);
        $this->assertSame($basic->plan_id, $sub->fresh()->plan_id);

        // This month: allowed (the staff member decided).
        $this->change($sub, ['plan_id' => $big->plan_id, 'plan_effective_from' => '2026-10-20'])->assertOk(); // any day in the month
        $this->assertSame(['August 2026' => 800.0, 'September 2026' => 800.0, 'October 2026' => 1300.0], $this->dues($sub));
    }

    public function test_a_mistake_in_the_plan_can_be_corrected_for_the_months_it_affected(): void
    {
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $sub = $this->subscriber($big); // wrongly on the big plan from the start

        // Put right: they were on Basic from August, and move to Big from November.
        $this->change($sub, ['plan_id' => $basic->plan_id, 'plan_effective_from' => '2026-08-01'])->assertOk();
        $this->change($sub, ['plan_id' => $big->plan_id])->assertOk(); // default: next month

        $this->assertSame(['August 2026' => 800.0, 'September 2026' => 800.0, 'October 2026' => 800.0], $this->dues($sub));
        $this->travelTo(now('Asia/Manila')->setDate(2026, 11, 5)->setTime(12, 0));
        $this->assertSame(1300.0, $this->dues($sub)['November 2026']);
    }

    public function test_changing_a_plans_price_does_not_re_price_past_months_either(): void
    {
        $basic = $this->plan('Basic', 800);
        $sub = $this->subscriber($basic);

        $basic->update(['monthly_rate' => 900]);

        $this->assertSame(['August 2026' => 800.0, 'September 2026' => 800.0, 'October 2026' => 800.0], $this->dues($sub));
        $this->travelTo(now('Asia/Manila')->setDate(2026, 11, 5)->setTime(12, 0));
        $this->assertSame(900.0, $this->dues($sub)['November 2026']);
        $this->assertSame(900.0, app(BillingService::class)->getBreakdown($sub->fresh())['monthly_rate']);
    }

    public function test_the_status_is_worked_out_again_after_a_plan_change(): void
    {
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $sub = $this->subscriber($basic);
        $sub->update(['status' => 'Unpaid']);
        \App\Models\Payment::create(['subscriber_id' => $sub->subscriber_id, 'amount' => 1600, 'payment_date' => '2026-10-01', 'or_number' => 'OR1', 'payment_method' => 'Cash']);

        // Two of the three months are paid: still one behind. A plan change starting this month raises October's price.
        $this->change($sub, ['plan_id' => $big->plan_id, 'plan_effective_from' => '2026-10-01'])->assertOk();

        $breakdown = app(BillingService::class)->getBreakdown($sub->fresh());
        $this->assertSame(1300.0, (float) $breakdown['months'][2]['due']);
        $this->assertSame(1, $breakdown['months_behind']);
        $this->assertSame(1300.0, (float) $breakdown['balance']);
    }

    public function test_months_are_priced_even_without_history_lines(): void
    {
        $basic = $this->plan('Basic', 800);
        $sub = $this->subscriber($basic);
        DB::table('subscriber_plan_history')->delete();
        DB::table('plan_rate_history')->delete();

        $this->assertSame(['August 2026' => 800.0, 'September 2026' => 800.0, 'October 2026' => 800.0], $this->dues($sub));
    }

    public function test_someone_who_registers_starts_as_active_not_unpaid(): void
    {
        $this->postJson('/api/register', [
            'first_name' => 'New', 'last_name' => 'Person', 'address' => 'Malete, Palayan City', 'contact_number' => '09175559999',
            'password' => 'password1', 'password_confirmation' => 'password1', 'accept_terms' => true,
        ])->assertCreated();

        $this->assertSame('Active', Subscriber::where('contact_number', '09175559999')->value('status'));
    }
}
