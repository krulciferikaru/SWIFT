<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use App\Services\BillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminRecoTest extends TestCase
{
    use RefreshDatabase;

    private function plan(): Plan
    {
        return Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 500, 'status' => 'Active']);
    }

    public function test_billing_skips_installation_month(): void
    {
        $this->travelTo(now()->setDate(2026, 5, 20));
        $sub = Subscriber::create([
            'plan_id' => $this->plan()->plan_id, 'name' => 'A B', 'contact_number' => '09170000001',
            'connection_date' => '2026-03-15', 'account_status' => 'active', 'status' => 'Unpaid',
        ]);

        $months = collect(app(BillingService::class)->getBreakdown($sub)['months'])->pluck('label')->all();

        $this->assertSame(['April 2026', 'May 2026'], $months);

        $new = Subscriber::create([
            'plan_id' => $sub->plan_id, 'name' => 'C D', 'contact_number' => '09170000002',
            'connection_date' => '2026-05-02', 'account_status' => 'active', 'status' => 'Active',
        ]);
        $this->assertSame(0.0, (float) app(BillingService::class)->getBreakdown($new)['balance']);
    }

    public function test_register_with_names_and_contact_then_login_by_contact(): void
    {
        $this->postJson('/api/register', [
            'first_name' => 'juan', 'last_name' => 'cruz', 'address' => 'Malete, Palayan City', 'contact_number' => '09171112222',
            'password' => 'password1', 'password_confirmation' => 'password1',
        ])->assertCreated();

        $sub = Subscriber::where('contact_number', '09171112222')->first();
        $this->assertSame('Juan Cruz', $sub->name);
        $this->assertNull($sub->email);

        $staff = User::create(['name' => 'S', 'email' => 's@x.test', 'password' => 'abcd1234', 'role' => 'secretary', 'account_status' => 'active']);
        $this->actingAs($staff)->patchJson("/api/subscribers/{$sub->subscriber_id}/approve")->assertOk();
        $this->app['auth']->forgetGuards();

        $this->postJson('/api/login', ['login' => '09171112222', 'password' => 'password1'])->assertOk()->assertJsonStructure(['token']);
        $this->postJson('/api/login', ['login' => 's@x.test', 'password' => 'abcd1234'])->assertOk();
    }

    public function test_archive_restore_and_permanent_delete(): void
    {
        $admin = User::create(['name' => 'A', 'email' => 'a@x.test', 'password' => 'abcd1234', 'role' => 'admin', 'account_status' => 'active']);
        $plan = $this->plan();
        $sub = Subscriber::create([
            'plan_id' => $plan->plan_id, 'name' => 'A B', 'contact_number' => '09170000001',
            'connection_date' => '2026-03-15', 'account_status' => 'active', 'status' => 'Active',
        ]);

        $this->actingAs($admin)->deleteJson("/api/subscribers/{$sub->subscriber_id}")->assertOk();
        $this->assertSoftDeleted('subscriber', ['subscriber_id' => $sub->subscriber_id]);
        $this->getJson('/api/archive/subscribers')->assertOk()->assertJsonPath('data.total', 1);

        $this->patchJson("/api/archive/subscribers/{$sub->subscriber_id}/restore")->assertOk();
        $this->assertNotSoftDeleted('subscriber', ['subscriber_id' => $sub->subscriber_id]);

        // Archiving the plan keeps the subscriber's billing rate.
        $this->deleteJson("/api/plans/{$plan->plan_id}")->assertOk();
        $this->assertSame(500.0, (float) $sub->fresh()->plan->monthly_rate);
        $this->deleteJson("/api/archive/plans/{$plan->plan_id}")->assertStatus(422);

        $this->deleteJson("/api/subscribers/{$sub->subscriber_id}")->assertOk();
        $this->deleteJson("/api/archive/subscribers/{$sub->subscriber_id}")->assertOk();
        $this->assertDatabaseMissing('subscriber', ['subscriber_id' => $sub->subscriber_id]);
        $this->deleteJson("/api/archive/plans/{$plan->plan_id}")->assertOk();
    }

    public function test_report_ranges(): void
    {
        $admin = User::create(['name' => 'A', 'email' => 'a@x.test', 'password' => 'abcd1234', 'role' => 'admin', 'account_status' => 'active']);
        $this->actingAs($admin);

        $this->getJson('/api/reports/collections?range=three_months')->assertOk()->assertJsonPath('data.range', 'three_months');
        $this->getJson('/api/reports/collections?range=annual&year=2025')
            ->assertOk()->assertJsonPath('data.period.start', '2025-01-01')->assertJsonPath('data.period.end', '2025-12-31');
        $this->getJson('/api/reports/financial-statement?range=monthly&month=2026-02')->assertOk()->assertJsonPath('data.period_label', 'February 2026');
    }
}
