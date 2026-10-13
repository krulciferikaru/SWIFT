<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApprovalWithPlanTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false]);
        Http::fake(['*' => Http::response(['status' => 'success'])]);
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
    }

    private function staff(): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Sec', 'email' => 'sec'.uniqid().'@a.test', 'password' => bcrypt('x'), 'role' => 'secretary',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function plan(string $name = 'Basic', string $status = 'Active'): Plan
    {
        return Plan::create(['plan_name' => $name, 'monthly_rate' => 500, 'speed_mbps' => 10, 'status' => $status]);
    }

    private function applicant(array $extra = []): Subscriber
    {
        return Subscriber::create(array_merge([
            'name' => 'New Person', 'contact_number' => '0917'.random_int(1000000, 9999999),
            'address' => 'Malete, Palayan City', 'account_status' => 'pending', 'status' => 'Unpaid', 'password' => bcrypt('x'),
        ], $extra));
    }

    public function test_approving_sets_the_plan_and_the_installation_date(): void
    {
        $plan = $this->plan();
        $sub = $this->applicant();
        Sanctum::actingAs($this->staff());

        $this->patchJson("/api/subscribers/{$sub->subscriber_id}/approve", ['plan_id' => $plan->plan_id, 'connection_date' => '2026-10-02'])
            ->assertOk();

        $fresh = $sub->fresh();
        $this->assertSame('active', $fresh->account_status);
        $this->assertSame($plan->plan_id, $fresh->plan_id);
        $this->assertSame('2026-10-02', $fresh->connection_date->toDateString());
        $this->assertDatabaseHas('audit_logs', ['action' => 'approval.approved']);
    }

    public function test_the_status_is_worked_out_from_the_plan_and_date(): void
    {
        $plan = $this->plan();
        $sub = $this->applicant();
        Sanctum::actingAs($this->staff());

        // Installed this month: nothing is billed yet, so they start Active (not the default Unpaid).
        $this->patchJson("/api/subscribers/{$sub->subscriber_id}/approve", ['plan_id' => $plan->plan_id, 'connection_date' => '2026-10-02'])->assertOk();

        $this->assertSame('Active', $sub->fresh()->status);
    }

    public function test_a_past_installation_date_starts_them_behind(): void
    {
        $plan = $this->plan();
        $sub = $this->applicant();
        Sanctum::actingAs($this->staff());

        $this->patchJson("/api/subscribers/{$sub->subscriber_id}/approve", ['plan_id' => $plan->plan_id, 'connection_date' => '2026-08-02'])->assertOk();

        $this->assertSame('Unpaid', $sub->fresh()->status); // billed for September and October, nothing paid
    }

    public function test_both_are_required_for_someone_who_signed_up_themselves(): void
    {
        $plan = $this->plan();
        $sub = $this->applicant();
        Sanctum::actingAs($this->staff());

        $this->patchJson("/api/subscribers/{$sub->subscriber_id}/approve")->assertStatus(422)->assertJsonValidationErrors(['plan_id', 'connection_date']);
        $this->patchJson("/api/subscribers/{$sub->subscriber_id}/approve", ['plan_id' => $plan->plan_id])->assertStatus(422)->assertJsonValidationErrors('connection_date');
        $this->patchJson("/api/subscribers/{$sub->subscriber_id}/approve", ['connection_date' => '2026-10-02'])->assertStatus(422)->assertJsonValidationErrors('plan_id');
        $this->assertSame('pending', $sub->fresh()->account_status);
        $this->assertDatabaseMissing('users', ['subscriber_id' => $sub->subscriber_id]);
    }

    public function test_only_a_plan_that_is_offered_can_be_chosen(): void
    {
        $archived = $this->plan('Old');
        $archived->delete();
        $notOffered = $this->plan('Paused', 'Inactive');
        $sub = $this->applicant();
        Sanctum::actingAs($this->staff());

        foreach ([$archived->plan_id, $notOffered->plan_id, 9999] as $bad) {
            $this->patchJson("/api/subscribers/{$sub->subscriber_id}/approve", ['plan_id' => $bad, 'connection_date' => '2026-10-02'])
                ->assertStatus(422)->assertJsonValidationErrors('plan_id');
        }
        $this->assertSame('pending', $sub->fresh()->account_status);
    }

    public function test_the_installation_date_must_be_a_real_reasonable_date(): void
    {
        $plan = $this->plan();
        $sub = $this->applicant();
        Sanctum::actingAs($this->staff());

        foreach (['not-a-date', '1999-01-01', '2027-06-01', '02/10/2026'] as $bad) {
            $this->patchJson("/api/subscribers/{$sub->subscriber_id}/approve", ['plan_id' => $plan->plan_id, 'connection_date' => $bad])
                ->assertStatus(422)->assertJsonValidationErrors('connection_date');
        }
        // Up to two months ahead is fine: approved now, installed soon.
        $this->patchJson("/api/subscribers/{$sub->subscriber_id}/approve", ['plan_id' => $plan->plan_id, 'connection_date' => '2026-11-20'])->assertOk();
    }

    public function test_someone_who_already_has_them_is_not_asked_again_but_can_change_them(): void
    {
        $plan = $this->plan();
        $other = $this->plan('Fast');
        $sub = $this->applicant(['plan_id' => $plan->plan_id, 'connection_date' => '2026-09-01']);
        Sanctum::actingAs($this->staff());

        $this->patchJson("/api/subscribers/{$sub->subscriber_id}/approve")->assertOk();
        $this->assertSame($plan->plan_id, $sub->fresh()->plan_id);

        $again = $this->applicant(['plan_id' => $plan->plan_id, 'connection_date' => '2026-09-01']);
        $this->patchJson("/api/subscribers/{$again->subscriber_id}/approve", ['plan_id' => $other->plan_id])->assertOk();
        $this->assertSame($other->plan_id, $again->fresh()->plan_id);
        $this->assertSame('2026-09-01', $again->fresh()->connection_date->toDateString());
    }
}
