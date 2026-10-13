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

/** The field collector looks people up and records payments, and sees nothing else. */
class FieldCollectorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false]);
        Http::fake(['*' => Http::response(['status' => 'success'])]);
    }

    private function user(string $role): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => $role.uniqid().'@p.test', 'password' => bcrypt('password1'), 'role' => $role,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function subscriber(): Subscriber
    {
        $plan = Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 800, 'speed_mbps' => 10, 'status' => 'Active']);

        return Subscriber::create([
            'plan_id' => $plan->plan_id, 'name' => 'Ana Cruz', 'address' => 'Malete', 'contact_number' => '09171112222',
            'email' => 'ana@private.test', 'mac_address' => 'AA:BB:CC:DD:EE:FF',
            'connection_date' => now()->subMonths(2)->toDateString(), 'account_status' => 'active', 'status' => 'Active',
        ]);
    }

    public function test_the_role_is_fixed_to_viewing_subscribers_and_payments(): void
    {
        $this->assertEqualsCanonicalizing(
            ['subscribers.view', 'payments.view', 'payments.record'],
            $this->user('collector')->effective_permissions,
        );
    }

    public function test_admin_can_create_a_collector_and_cannot_widen_the_role(): void
    {
        $admin = $this->user('admin');
        Sanctum::actingAs($admin);

        $this->postJson('/api/users', [
            'name' => 'Pedro Collector', 'email' => 'pedro@swift.test', 'contact_number' => '09175550000',
            'password' => 'password1', 'password_confirmation' => 'password1', 'role' => 'collector',
        ])->assertCreated();
        $collector = User::where('email', 'pedro@swift.test')->firstOrFail();
        $this->assertSame('collector', $collector->role);

        $this->passwordConfirmed($admin);
        $this->patchJson("/api/users/{$collector->id}/permissions", ['permissions' => ['plans.manage']])->assertStatus(422);
    }

    public function test_a_collector_sees_subscribers_without_email_or_mac_address(): void
    {
        $sub = $this->subscriber();
        Sanctum::actingAs($this->user('collector'));

        $row = $this->getJson('/api/subscribers?with_balance=1')->assertOk()->json('data.data.0');
        $this->assertSame('Ana Cruz', $row['name']);
        $this->assertSame('09171112222', $row['contact_number']);
        $this->assertArrayNotHasKey('email', $row);
        $this->assertArrayNotHasKey('mac_address', $row);

        $one = $this->getJson("/api/subscribers/{$sub->subscriber_id}")->assertOk()->json('data');
        $this->assertArrayNotHasKey('email', $one);
        $this->assertArrayNotHasKey('mac_address', $one);

        // Searching can't be used to find out what is hidden.
        $this->getJson('/api/subscribers?search=ana@private.test')->assertOk()->assertJsonCount(0, 'data.data');
        $this->getJson('/api/subscribers?search=AA:BB:CC')->assertOk()->assertJsonCount(0, 'data.data');
        $this->getJson('/api/subscribers?search=Ana')->assertOk()->assertJsonCount(1, 'data.data');
    }

    public function test_a_secretary_still_sees_email_and_mac_address(): void
    {
        $this->subscriber();
        Sanctum::actingAs($this->user('secretary'));

        $row = $this->getJson('/api/subscribers')->assertOk()->json('data.data.0');
        $this->assertSame('ana@private.test', $row['email']);
        $this->assertSame('AA:BB:CC:DD:EE:FF', $row['mac_address']);
        $this->getJson('/api/subscribers?search=ana@private.test')->assertJsonCount(1, 'data.data');
    }

    public function test_a_collector_can_record_a_payment_but_not_cancel_one(): void
    {
        $sub = $this->subscriber();
        Sanctum::actingAs($this->user('collector'));

        $this->getJson('/api/payment-methods')->assertOk();
        $this->getJson("/api/subscribers/{$sub->subscriber_id}/billing")->assertOk();
        $this->postJson("/api/subscribers/{$sub->subscriber_id}/payments", [
            'amount' => 800, 'payment_date' => now()->toDateString(), 'or_number' => 'OR-1', 'payment_method' => 'Cash',
        ])->assertCreated();

        $payment = \App\Models\Payment::firstOrFail();
        $this->postJson("/api/payments/{$payment->id}/void", ['reason' => 'Typed wrong amount'])->assertForbidden();
    }

    public function test_a_collector_can_do_nothing_else(): void
    {
        $sub = $this->subscriber();
        Sanctum::actingAs($this->user('collector'));

        $this->postJson('/api/subscribers', [])->assertForbidden();
        $this->putJson("/api/subscribers/{$sub->subscriber_id}", ['name' => 'X'])->assertForbidden();
        $this->deleteJson("/api/subscribers/{$sub->subscriber_id}")->assertForbidden();
        $this->postJson('/api/plans', [])->assertForbidden();
        $this->getJson('/api/reports/collections?range=monthly&month=2026-10')->assertForbidden();
        $this->getJson('/api/archive/subscribers')->assertForbidden();
        $this->getJson('/api/subscribers/pending')->assertForbidden();
        $this->postJson('/api/sms/send', [])->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
        $this->getJson('/api/audit-logs')->assertForbidden();
        $this->getJson('/api/subscribers/check-duplicate?name=Ana')->assertForbidden();
    }
}
