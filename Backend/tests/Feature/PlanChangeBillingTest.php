<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\PlanChangeRequest;
use App\Models\Subscriber;
use App\Models\User;
use App\Services\BillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * A plan is never edited on a subscriber. Moving to another plan is a request that waits 24 to 48 hours and is then
 * confirmed by staff; the new price starts with the first statement after the confirmation, and a bill that has
 * already gone out is never re-priced.
 */
class PlanChangeBillingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false, 'billing.plan_change_hours' => 48]);
        Http::fake(['*' => Http::response(['status' => 'success'])]);
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
    }

    private function staff(string $role = 'secretary'): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => $role.uniqid().'@p.test', 'password' => bcrypt('x'), 'role' => $role,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function plan(string $name, float $rate): Plan
    {
        return Plan::create(['plan_name' => $name, 'monthly_rate' => $rate, 'speed_mbps' => 10, 'status' => 'Active']);
    }

    /** Installed 10 July 2026 on the given plan: billed for August, September and October. Paid up by default. */
    private function subscriber(Plan $plan, bool $paidUp = true): Subscriber
    {
        $sub = Subscriber::create([
            'plan_id' => $plan->plan_id, 'name' => 'Ana Cruz', 'contact_number' => '09171112222',
            'connection_date' => '2026-07-10', 'account_status' => 'active', 'status' => 'Active',
        ]);
        if ($paidUp) {
            Payment::create(['subscriber_id' => $sub->subscriber_id, 'amount' => 2400, 'payment_date' => '2026-10-01', 'or_number' => 'OR'.uniqid(), 'payment_method' => 'Cash']);
        }

        return $sub;
    }

    /** @return array<string, float> month label => what was due */
    private function dues(Subscriber $s): array
    {
        $months = app(BillingService::class)->getBreakdown($s->fresh())['months'];

        return collect($months)->pluck('due', 'label')->map(fn ($d) => (float) $d)->all();
    }

    private function request(Subscriber $s, Plan $to, ?User $by = null, array $extra = [])
    {
        Sanctum::actingAs($by ?? $this->staff());

        return $this->postJson("/api/subscribers/{$s->subscriber_id}/plan-change", ['plan_id' => $to->plan_id, ...$extra]);
    }

    private function confirm(PlanChangeRequest $change, ?User $by = null)
    {
        Sanctum::actingAs($by ?? $this->staff());

        return $this->postJson("/api/plan-changes/{$change->id}/complete");
    }

    public function test_the_plan_cannot_be_edited_directly(): void
    {
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $sub = $this->subscriber($basic);
        Sanctum::actingAs($this->staff('admin'));

        $this->putJson("/api/subscribers/{$sub->subscriber_id}", ['plan_id' => $big->plan_id])
            ->assertStatus(422)->assertJsonValidationErrors('plan_id');
        $this->assertSame($basic->plan_id, $sub->fresh()->plan_id);

        // Sending the plan they are already on is harmless, and everything else can still be edited.
        $this->putJson("/api/subscribers/{$sub->subscriber_id}", ['plan_id' => $basic->plan_id, 'name' => 'Ana C.'])->assertOk();
        $this->assertSame('Ana C.', $sub->fresh()->name);
        $this->assertSame($basic->plan_id, $sub->fresh()->plan_id);
    }

    public function test_a_request_waits_then_is_confirmed_and_the_new_price_starts_with_the_next_statement(): void
    {
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $sub = $this->subscriber($basic);

        $res = $this->request($sub, $big, null, ['reason' => 'Wants faster internet'])->assertCreated();
        $change = PlanChangeRequest::findOrFail($res->json('data.id'));
        $this->assertSame('pending', $change->status);
        $this->assertFalse($res->json('data.ready'));
        // Nothing changes until it is confirmed.
        $this->assertSame($basic->plan_id, $sub->fresh()->plan_id);

        // Too early: the waiting time (48 hours) has not passed.
        $this->confirm($change)->assertStatus(422)->assertJsonValidationErrors('plan_change');
        $this->travel(47)->hours();
        $this->confirm($change)->assertStatus(422);

        // After 48 hours, on the 16th: the statement for November has already gone out at the old price, so the new
        // price starts a month later, with December.
        $this->travel(2)->hours();
        $this->confirm($change)->assertOk()->assertJsonPath('data.effective_from', '2026-12-01');

        $this->assertSame($big->plan_id, $sub->fresh()->plan_id);
        $this->assertSame(['August 2026' => 800.0, 'September 2026' => 800.0, 'October 2026' => 800.0], $this->dues($sub));
        $this->travelTo(now('Asia/Manila')->setDate(2026, 11, 5)->setTime(12, 0));
        $this->assertSame(800.0, $this->dues($sub)['November 2026']);
        $this->travelTo(now('Asia/Manila')->setDate(2026, 12, 5)->setTime(12, 0));
        $this->assertSame(1300.0, $this->dues($sub)['December 2026']);
        $this->assertSame(800.0, $this->dues($sub)['November 2026']);
    }

    public function test_confirmed_before_the_statement_date_the_new_price_starts_next_month(): void
    {
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 1)->setTime(9, 0));
        $sub = $this->subscriber($basic);
        $change = PlanChangeRequest::findOrFail($this->request($sub, $big)->json('data.id'));

        // Confirmed on 3 October, before the statement on the 16th: November's bill is the first at the new price.
        $this->travel(48)->hours();
        $this->confirm($change)->assertOk()->assertJsonPath('data.effective_from', '2026-11-01');

        $this->travelTo(now('Asia/Manila')->setDate(2026, 11, 5)->setTime(12, 0));
        $this->assertSame(1300.0, $this->dues($sub)['November 2026']);
        $this->assertSame(800.0, $this->dues($sub)['October 2026']);
    }

    public function test_a_request_can_be_cancelled_until_it_is_confirmed(): void
    {
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $sub = $this->subscriber($basic);
        $change = PlanChangeRequest::findOrFail($this->request($sub, $big)->json('data.id'));

        $this->postJson("/api/plan-changes/{$change->id}/cancel")->assertOk();
        $this->assertSame('cancelled', $change->fresh()->status);
        $this->assertSame($basic->plan_id, $sub->fresh()->plan_id);

        // It cannot be confirmed or cancelled again, but a new one can be requested.
        $this->travel(49)->hours();
        $this->confirm($change)->assertStatus(422);
        $this->postJson("/api/plan-changes/{$change->id}/cancel")->assertStatus(422);
        $this->request($sub, $big)->assertCreated();
    }

    public function test_who_and_when_a_request_is_allowed(): void
    {
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $retired = $this->plan('Old', 500);
        $retired->delete();

        // Not for someone who owes money.
        $owes = $this->subscriber($basic, paidUp: false);
        $this->request($owes, $big)->assertStatus(422)->assertJsonValidationErrors('plan_id');

        // Not for a disconnected subscriber, the plan they are already on, or a plan that is not available.
        $paid = $this->subscriber($basic);
        $paid->update(['status' => 'Disconnected']);
        $this->request($paid, $big)->assertStatus(422);
        $paid->update(['status' => 'Active']);
        $this->request($paid, $basic)->assertStatus(422);
        $this->request($paid, $retired)->assertStatus(422);

        // One at a time.
        $this->request($paid, $big)->assertCreated();
        $this->request($paid, $big)->assertStatus(422);
        $this->assertSame(1, PlanChangeRequest::count());
    }

    public function test_the_task_is_its_own_permission_that_a_collector_does_not_have_by_default(): void
    {
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $sub = $this->subscriber($basic);

        $this->request($sub, $big, $this->staff('collector'))->assertForbidden();

        // A secretary has it (everything is on until an admin switches something off); an admin can switch it off.
        $secretary = $this->staff('secretary');
        $secretary->forceFill(['permissions' => ['subscribers.view', 'subscribers.manage']])->save();
        $this->request($sub, $big, $secretary->fresh())->assertForbidden();

        $secretary->forceFill(['permissions' => ['subscribers.view', 'subscribers.change_plan']])->save();
        $this->request($sub, $big, $secretary->fresh())->assertCreated();
    }

    public function test_the_subscriber_sees_the_change_that_is_waiting(): void
    {
        $basic = $this->plan('Basic', 800);
        $big = $this->plan('Big', 1300);
        $sub = $this->subscriber($basic);
        $this->request($sub, $big)->assertCreated();

        $id = DB::table('users')->insertGetId([
            'subscriber_id' => $sub->subscriber_id, 'name' => 'Ana', 'email' => 'ana@p.test', 'password' => bcrypt('x'), 'role' => 'subscriber',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);
        Sanctum::actingAs(User::findOrFail($id));

        $this->getJson('/api/me/billing')
            ->assertOk()
            ->assertJsonPath('data.pending_plan_change.from_plan', 'Basic')
            ->assertJsonPath('data.pending_plan_change.to_plan', 'Big');
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
            'first_name' => 'New', 'last_name' => 'Person', 'address' => 'Malate, Palayan City', 'contact_number' => '09175559999',
            'password' => 'password1', 'password_confirmation' => 'password1', 'accept_terms' => true,
        ])->assertCreated();

        $this->assertSame('Active', Subscriber::where('contact_number', '09175559999')->value('status'));
    }
}
