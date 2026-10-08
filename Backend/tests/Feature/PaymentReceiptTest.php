<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentReceiptTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role, ?int $subscriberId = null): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role).' Person',
            'email' => $role.uniqid().'@r.test',
            'password' => 'x',
            'role' => $role,
            'subscriber_id' => $subscriberId,
            'account_status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function subscriberWithPayment(User $recorder): Subscriber
    {
        $plan = Plan::create(['plan_name' => 'Basic 10', 'monthly_rate' => 500, 'status' => 'Active']);
        $sub = Subscriber::create([
            'plan_id' => $plan->plan_id, 'name' => 'Juan Cruz', 'address' => 'Palayan City',
            'contact_number' => '09171234567', 'connection_date' => '2026-01-10',
            'account_status' => 'active', 'status' => 'Active',
        ]);
        Payment::create([
            'subscriber_id' => $sub->subscriber_id, 'amount' => 500, 'payment_date' => '2026-02-10',
            'or_number' => 'OR-1', 'payment_method' => 'Cash', 'recorded_by' => $recorder->id,
        ]);

        return $sub;
    }

    public function test_staff_history_says_who_received_each_payment(): void
    {
        $staff = $this->user('secretary');
        $sub = $this->subscriberWithPayment($staff);
        Sanctum::actingAs($staff);

        $this->getJson("/api/subscribers/{$sub->subscriber_id}/payments")
            ->assertOk()
            ->assertJsonPath('data.0.received_by', 'Secretary Person')
            ->assertJsonPath('data.0.or_number', 'OR-1');
    }

    public function test_a_subscriber_gets_their_own_history_with_receipt_details(): void
    {
        $staff = $this->user('secretary');
        $sub = $this->subscriberWithPayment($staff);
        Sanctum::actingAs($this->user('subscriber', $sub->subscriber_id));

        $this->getJson('/api/me/payments')
            ->assertOk()
            ->assertJsonPath('data.0.received_by', 'Secretary Person')
            ->assertJsonPath('subscriber.name', 'Juan Cruz')
            ->assertJsonPath('subscriber.plan_name', 'Basic 10')
            ->assertJsonPath('subscriber.address', 'Palayan City');
    }

    public function test_a_subscriber_cannot_read_someone_elses_history(): void
    {
        $staff = $this->user('secretary');
        $sub = $this->subscriberWithPayment($staff);
        Sanctum::actingAs($this->user('subscriber'));

        $this->getJson("/api/subscribers/{$sub->subscriber_id}/payments")->assertForbidden();
    }
}
