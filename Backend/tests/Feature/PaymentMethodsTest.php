<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentMethodsTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role = 'admin'): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => uniqid().'@pm.test', 'password' => 'x', 'role' => $role,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function subscriber(): Subscriber
    {
        return Subscriber::create(['name' => 'Juan Cruz', 'contact_number' => '09170000001',
            'connection_date' => '2026-01-10', 'account_status' => 'active', 'status' => 'Active']);
    }

    private function record(Subscriber $sub, string $method)
    {
        return $this->postJson("/api/subscribers/{$sub->subscriber_id}/payments", [
            'amount' => 500, 'payment_date' => '2026-02-10', 'or_number' => uniqid('OR'), 'payment_method' => $method,
        ]);
    }

    public function test_the_three_original_methods_exist_after_migrating(): void
    {
        Sanctum::actingAs($this->user('secretary'));

        $this->getJson('/api/payment-methods')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Cash')
            ->assertJsonPath('data.1.name', 'GCash')
            ->assertJsonPath('data.2.name', 'Others');
    }

    public function test_an_admin_can_add_a_method_and_payments_can_use_it(): void
    {
        Sanctum::actingAs($this->user());
        $this->postJson('/api/payment-methods', ['name' => '  Bank transfer '])->assertCreated();

        $this->record($this->subscriber(), 'Bank transfer')->assertCreated();
        $this->assertDatabaseHas('payments', ['payment_method' => 'Bank transfer']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'payment_method.created']);
    }

    public function test_an_unknown_or_switched_off_method_is_refused(): void
    {
        Sanctum::actingAs($this->user());
        $sub = $this->subscriber();

        $this->record($sub, 'Barter')->assertStatus(422)->assertJsonValidationErrors('payment_method');

        $id = PaymentMethod::where('name', 'Others')->value('id');
        $this->putJson("/api/payment-methods/{$id}", ['is_active' => false])->assertOk();
        $this->record($sub, 'Others')->assertStatus(422);
    }

    public function test_names_must_be_unique_ignoring_case(): void
    {
        Sanctum::actingAs($this->user());

        $this->postJson('/api/payment-methods', ['name' => 'gcash'])->assertStatus(422);
        $this->postJson('/api/payment-methods', ['name' => 'X'])->assertStatus(422);
    }

    public function test_renaming_updates_recorded_payments_so_history_stays_consistent(): void
    {
        Sanctum::actingAs($this->user());
        $this->record($this->subscriber(), 'GCash')->assertCreated();
        $id = PaymentMethod::where('name', 'GCash')->value('id');

        $this->putJson("/api/payment-methods/{$id}", ['name' => 'GCash / Maya'])->assertOk();

        $this->assertSame(1, Payment::where('payment_method', 'GCash / Maya')->count());
        $this->assertSame(0, Payment::where('payment_method', 'GCash')->count());
    }

    public function test_a_method_in_use_cannot_be_deleted_but_an_unused_one_can(): void
    {
        Sanctum::actingAs($this->user());
        $this->record($this->subscriber(), 'Cash')->assertCreated();

        $cash = PaymentMethod::where('name', 'Cash')->value('id');
        $others = PaymentMethod::where('name', 'Others')->value('id');

        $this->deleteJson("/api/payment-methods/{$cash}")->assertStatus(422);
        $this->deleteJson("/api/payment-methods/{$others}")->assertOk();
    }

    public function test_at_least_one_method_stays_on(): void
    {
        Sanctum::actingAs($this->user());
        foreach (['GCash', 'Others'] as $name) {
            $this->putJson('/api/payment-methods/'.PaymentMethod::where('name', $name)->value('id'), ['is_active' => false])->assertOk();
        }

        $cash = PaymentMethod::where('name', 'Cash')->value('id');
        $this->putJson("/api/payment-methods/{$cash}", ['is_active' => false])->assertStatus(422);
    }

    public function test_only_admins_can_change_the_list_and_only_they_see_inactive_ones(): void
    {
        $id = PaymentMethod::where('name', 'Others')->value('id');
        PaymentMethod::whereKey($id)->update(['is_active' => false]);

        Sanctum::actingAs($this->user('secretary'));
        $this->postJson('/api/payment-methods', ['name' => 'Check'])->assertForbidden();
        $this->putJson("/api/payment-methods/{$id}", ['is_active' => true])->assertForbidden();
        $this->deleteJson("/api/payment-methods/{$id}")->assertForbidden();
        $this->getJson('/api/payment-methods?all=1')->assertJsonCount(2, 'data');

        Sanctum::actingAs($this->user());
        $this->getJson('/api/payment-methods?all=1')->assertJsonCount(3, 'data')->assertJsonPath('data.0.payments_count', 0);
    }
}
