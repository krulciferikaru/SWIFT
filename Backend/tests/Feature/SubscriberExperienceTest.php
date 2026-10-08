<?php

namespace Tests\Feature;

use App\Models\CompanyInfo;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriberExperienceTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role, ?int $subscriberId = null): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => uniqid().'@s.test', 'password' => 'x', 'role' => $role,
            'subscriber_id' => $subscriberId, 'account_status' => 'active',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function subscriber(string $connection, string $status = 'Active'): Subscriber
    {
        $plan = Plan::create(['plan_name' => 'Basic 10', 'monthly_rate' => 500, 'status' => 'Active']);

        return Subscriber::create([
            'plan_id' => $plan->plan_id, 'name' => 'Juan Cruz', 'contact_number' => '09171234567',
            'connection_date' => $connection, 'account_status' => 'active', 'status' => $status,
        ]);
    }

    public function test_billing_tells_a_disconnected_subscriber_their_status(): void
    {
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
        $sub = $this->subscriber('2026-01-10', 'Disconnected');
        Sanctum::actingAs($this->user('subscriber', $sub->subscriber_id));

        $this->getJson('/api/me/billing')
            ->assertOk()
            ->assertJsonPath('data.status', 'Disconnected')
            ->assertJsonPath('data.plan_name', 'Basic 10')
            ->assertJsonPath('data.due_day', 10);
    }

    public function test_next_due_date_is_this_month_until_the_day_passes_then_next_month(): void
    {
        $sub = $this->subscriber('2026-01-20');
        Sanctum::actingAs($this->user('subscriber', $sub->subscriber_id));

        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
        $this->getJson('/api/me/billing')->assertJsonPath('data.next_due_date', '2026-10-20');

        // On the day itself it is still "due today".
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 20)->setTime(9, 0));
        $this->getJson('/api/me/billing')->assertJsonPath('data.next_due_date', '2026-10-20');

        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 21)->setTime(9, 0));
        $this->getJson('/api/me/billing')->assertJsonPath('data.next_due_date', '2026-11-20');
    }

    public function test_a_due_day_after_the_end_of_a_short_month_falls_on_its_last_day(): void
    {
        $sub = $this->subscriber('2026-01-31');
        Sanctum::actingAs($this->user('subscriber', $sub->subscriber_id));

        $this->travelTo(now('Asia/Manila')->setDate(2027, 2, 10)->setTime(9, 0));
        $this->getJson('/api/me/billing')->assertJsonPath('data.next_due_date', '2027-02-28');
    }

    public function test_company_info_is_public_and_starts_empty(): void
    {
        $this->getJson('/api/company-info')
            ->assertOk()
            ->assertJsonPath('data.phone', null)
            ->assertJsonPath('data.how_to_pay', null);
    }

    public function test_only_an_admin_can_change_company_info_and_it_is_logged(): void
    {
        Sanctum::actingAs($this->user('secretary'));
        $this->putJson('/api/company-info', ['phone' => '123'])->assertForbidden();

        Sanctum::actingAs($this->user('admin'));
        $this->putJson('/api/company-info', [
            'phone' => '  (044) 111-2222 ', 'email' => 'help@example.test', 'how_to_pay' => 'Pay your collector or visit the office.',
            'address' => '',
        ])->assertOk()->assertJsonPath('data.phone', '(044) 111-2222')->assertJsonPath('data.address', null);

        $this->assertSame('help@example.test', CompanyInfo::current()->email);
        $this->assertDatabaseHas('audit_logs', ['action' => 'company.updated']);

        // Anyone can read it, including people who are not signed in.
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/company-info')->assertOk()->assertJsonPath('data.email', 'help@example.test');
    }

    public function test_company_info_rejects_a_bad_email(): void
    {
        Sanctum::actingAs($this->user('admin'));
        $this->putJson('/api/company-info', ['email' => 'not-an-email'])->assertStatus(422);
    }
}
