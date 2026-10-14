<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\SubscriberStatusChange;
use App\Models\User;
use App\Services\BillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StatusHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false]);
        Http::fake(['*' => Http::response(['status' => 'success'])]);
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
    }

    private function user(string $role = 'admin'): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => $role.uniqid().'@h.test', 'password' => bcrypt('x'), 'role' => $role,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function subscriber(string $status = 'Active', string $account = 'active'): Subscriber
    {
        $plan = Plan::firstOrCreate(['plan_name' => 'Basic'], ['monthly_rate' => 500, 'speed_mbps' => 10, 'status' => 'Active']);

        return Subscriber::create([
            'plan_id' => $plan->plan_id, 'name' => 'Ana Cruz', 'contact_number' => '0917'.random_int(1000000, 9999999),
            'connection_date' => '2026-07-10', 'account_status' => $account, 'status' => $status,
        ]);
    }

    private function lines(Subscriber $s): array
    {
        return SubscriberStatusChange::where('subscriber_id', $s->subscriber_id)->orderBy('id')
            ->get(['previous_status', 'status', 'source'])->map(fn ($r) => [$r->previous_status, $r->status, $r->source])->all();
    }

    public function test_a_new_subscriber_starts_a_history(): void
    {
        $sub = $this->subscriber('Active');

        $this->assertSame([[null, 'Active', 'created']], $this->lines($sub));
    }

    public function test_an_applicant_has_no_history_until_they_are_approved(): void
    {
        $sub = $this->subscriber('Unpaid', 'pending');
        $this->assertSame([], $this->lines($sub));

        Sanctum::actingAs($this->user('secretary'));
        $this->patchJson("/api/subscribers/{$sub->subscriber_id}/approve")->assertOk();

        // Approving works the status out from the plan and date (installed in July, nothing paid: three months owed).
        $this->assertSame([[null, 'Disconnected', 'approved']], $this->lines($sub));
    }

    public function test_a_change_made_by_staff_is_recorded_with_who(): void
    {
        $sub = $this->subscriber('Active');
        $staff = $this->user('admin');
        Sanctum::actingAs($staff);

        $this->patchJson("/api/subscribers/{$sub->subscriber_id}/status", ['status' => 'Disconnected'])->assertOk();

        $this->assertSame(['Active', 'Disconnected', 'staff'], $this->lines($sub)[1]);
        $this->assertSame($staff->id, SubscriberStatusChange::latest('id')->first()->changed_by);
    }

    public function test_the_status_change_after_a_payment_is_marked_automatic(): void
    {
        $sub = $this->subscriber('Active');
        app(BillingService::class)->recalculateStatus($sub->fresh()); // three months owed: Disconnected

        $this->assertSame(['Active', 'Disconnected', 'automatic'], $this->lines($sub)[1]);
        $this->assertNull(SubscriberStatusChange::latest('id')->first()->changed_by);
    }

    public function test_saving_without_a_status_change_adds_nothing(): void
    {
        $sub = $this->subscriber('Active');

        $sub->update(['address' => 'Malate, Palayan City']);
        $sub->update(['status' => 'Active']);

        $this->assertCount(1, $this->lines($sub));
    }

    public function test_staff_see_the_timeline_with_who_changed_what(): void
    {
        $sub = $this->subscriber('Active');
        Sanctum::actingAs($this->user('admin'));
        $this->patchJson("/api/subscribers/{$sub->subscriber_id}/status", ['status' => 'Unpaid'])->assertOk();

        $data = $this->getJson("/api/subscribers/{$sub->subscriber_id}/status-history")->assertOk()->json('data');

        $this->assertSame('2026-07-10', $data['installation_date']);
        $this->assertSame('Unpaid', $data['current_status']);
        $this->assertSame(['Unpaid', 'Active'], array_column($data['events'], 'status')); // newest first
        $this->assertSame('Admin', $data['events'][0]['changed_by']);
    }

    public function test_a_subscriber_sees_only_their_own_history_without_staff_names(): void
    {
        $mine = $this->subscriber('Active');
        $other = $this->subscriber('Active');
        $login = User::create(['subscriber_id' => $mine->subscriber_id, 'name' => 'Ana Cruz', 'contact_number' => $mine->contact_number, 'password' => 'abcd1234', 'role' => 'subscriber', 'account_status' => 'active']);
        Sanctum::actingAs($this->user('admin'));
        $this->patchJson("/api/subscribers/{$mine->subscriber_id}/status", ['status' => 'Unpaid'])->assertOk();
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($login);

        $data = $this->getJson('/api/me/status-history')->assertOk()->json('data');

        $this->assertSame('Unpaid', $data['current_status']);
        $this->assertCount(2, $data['events']);
        $this->assertNull($data['events'][0]['changed_by']);
        // And they cannot ask for anyone else's.
        $this->getJson("/api/subscribers/{$other->subscriber_id}/status-history")->assertForbidden();
    }

    public function test_it_says_when_the_history_began_for_people_who_were_already_subscribers(): void
    {
        $sub = $this->subscriber('Active');
        SubscriberStatusChange::where('subscriber_id', $sub->subscriber_id)->delete();
        SubscriberStatusChange::create(['subscriber_id' => $sub->subscriber_id, 'status' => 'Active', 'source' => 'start']);
        Sanctum::actingAs($this->user('admin'));

        $data = $this->getJson("/api/subscribers/{$sub->subscriber_id}/status-history")->assertOk()->json('data');

        $this->assertNotNull($data['history_began_at']);
        $this->assertSame('start', $data['events'][0]['source']);
        $this->assertNotNull(Payment::query()); // keeps the import used
    }
}
