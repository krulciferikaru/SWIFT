<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use App\Services\BillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentVoidTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false]);
        Http::fake(['*' => Http::response(['status' => 'success'])]);
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
    }

    private function user(string $role): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => $role.uniqid().'@v.test', 'password' => bcrypt('x'), 'role' => $role,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    /** Installed in July at 500 a month: billed for Aug, Sep and Oct = 1500. */
    private function subscriber(): Subscriber
    {
        $plan = Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 500, 'speed_mbps' => 10, 'status' => 'Active']);

        return Subscriber::create([
            'plan_id' => $plan->plan_id, 'name' => 'Ana Cruz', 'contact_number' => '09171112222',
            'connection_date' => '2026-07-10', 'account_status' => 'active', 'status' => 'Unpaid',
        ]);
    }

    private function pay(Subscriber $s, float $amount, string $or = 'OR-1'): Payment
    {
        return Payment::create([
            'subscriber_id' => $s->subscriber_id, 'amount' => $amount, 'payment_date' => '2026-10-02',
            'or_number' => $or, 'payment_method' => 'Cash',
        ]);
    }

    private function balance(Subscriber $s): float
    {
        return (float) app(BillingService::class)->getBreakdown($s->fresh())['balance'];
    }

    public function test_a_cancelled_payment_stops_counting_but_stays_in_the_history(): void
    {
        $sub = $this->subscriber();
        $payment = $this->pay($sub, 5000); // the typo: meant 500
        $this->assertSame(0.0, $this->balance($sub));
        $admin = $this->user('admin');
        Sanctum::actingAs($admin);
        $this->passwordConfirmed($admin);

        $this->postJson("/api/payments/{$payment->id}/void", ['reason' => 'Typed 5000 instead of 500'])
            ->assertOk()
            ->assertJsonPath('data.payment.void_reason', 'Typed 5000 instead of 500')
            ->assertJsonPath('data.payment.voided_by_name', 'Admin');

        // The balance is worked out again without it.
        $this->assertSame(1500.0, $this->balance($sub));
        // The record is still there (nothing is deleted or edited) with its original figures.
        $kept = Payment::withVoided()->findOrFail($payment->id);
        $this->assertSame('5000.00', (string) $kept->amount);
        $this->assertNotNull($kept->voided_at);
        $this->assertSame($admin->id, $kept->voided_by);
        // And it is invisible to ordinary queries, so no total can include it.
        $this->assertSame(0, Payment::count());
        $this->assertSame(1, Payment::withVoided()->count());
    }

    public function test_the_status_follows_the_balance(): void
    {
        $sub = $this->subscriber();
        $sub->update(['status' => 'Active']);
        $this->pay($sub, 500, 'OR-1');
        $payment = $this->pay($sub, 1000, 'OR-2'); // together they cover all three months
        $admin = $this->user('admin');
        Sanctum::actingAs($admin);
        $this->passwordConfirmed($admin);

        $this->postJson("/api/payments/{$payment->id}/void", ['reason' => 'Wrong subscriber'])->assertOk();

        $this->assertSame('Unpaid', $sub->fresh()->status);
    }

    public function test_the_correct_payment_can_then_be_recorded_with_the_same_receipt_number(): void
    {
        $sub = $this->subscriber();
        $wrong = $this->pay($sub, 5000, 'OR-77');
        $admin = $this->user('admin');
        Sanctum::actingAs($admin);
        $this->passwordConfirmed($admin);
        $this->postJson("/api/payments/{$wrong->id}/void", ['reason' => 'Typed 5000 instead of 500'])->assertOk();

        $this->postJson("/api/subscribers/{$sub->subscriber_id}/payments", [
            'amount' => 500, 'payment_date' => '2026-10-02', 'or_number' => 'OR-77', 'payment_method' => 'Cash',
        ])->assertCreated();

        $this->assertSame(1000.0, $this->balance($sub));
        $this->assertSame(2, Payment::withVoided()->where('or_number', 'OR-77')->count());
    }

    public function test_it_needs_a_reason_the_password_and_an_admin(): void
    {
        $sub = $this->subscriber();
        $payment = $this->pay($sub, 500);

        $admin = $this->user('admin');
        Sanctum::actingAs($admin);
        $this->postJson("/api/payments/{$payment->id}/void", ['reason' => 'Typo'])->assertStatus(423); // type the password first
        $this->passwordConfirmed($admin);
        $this->postJson("/api/payments/{$payment->id}/void", [])->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->postJson("/api/payments/{$payment->id}/void", ['reason' => 'no'])->assertStatus(422);
        $this->assertNull($payment->fresh()->voided_at);

        $secretary = $this->user('secretary');
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($secretary);
        $this->passwordConfirmed($secretary);
        $this->postJson("/api/payments/{$payment->id}/void", ['reason' => 'Typed the wrong amount'])->assertOk();
        $this->assertNotNull($payment->fresh()->voided_at);
    }

    public function test_it_cannot_be_cancelled_twice_and_is_written_to_the_audit_trail(): void
    {
        $sub = $this->subscriber();
        $payment = $this->pay($sub, 500);
        $admin = $this->user('admin');
        Sanctum::actingAs($admin);
        $this->passwordConfirmed($admin);

        $this->postJson("/api/payments/{$payment->id}/void", ['reason' => 'Entered twice by mistake'])->assertOk();
        $this->postJson("/api/payments/{$payment->id}/void", ['reason' => 'Entered twice by mistake'])->assertStatus(422);

        $this->assertDatabaseHas('audit_logs', ['action' => 'payment.voided', 'user_id' => $admin->id]);
        $this->assertSame(1, DB::table('audit_logs')->where('action', 'payment.voided')->count());
    }

    public function test_the_history_shows_cancelled_payments_but_reports_and_the_dashboard_do_not_count_them(): void
    {
        $sub = $this->subscriber();
        $good = $this->pay($sub, 500, 'OR-1');
        $bad = $this->pay($sub, 5000, 'OR-2');
        $admin = $this->user('admin');
        Sanctum::actingAs($admin);
        $this->passwordConfirmed($admin);
        $this->postJson("/api/payments/{$bad->id}/void", ['reason' => 'Typed 5000 instead of 500'])->assertOk();

        $history = $this->getJson("/api/subscribers/{$sub->subscriber_id}/payments")->assertOk()->json('data');
        $this->assertCount(2, $history);
        $this->assertSame(['OR-2'], collect($history)->whereNotNull('voided_at')->pluck('or_number')->values()->all());

        $dash = $this->getJson('/api/dashboard/period?period=month')->assertOk()->json('data');
        $this->assertEquals(500.0, $dash['collected']);
        $this->assertSame(1, $dash['payments_count']);

        $report = $this->getJson('/api/reports/collections?period=month&month=2026-10')->assertOk()->json('data');
        $this->assertEquals(500.0, $report['summary']['total_collected']);
        $this->assertSame(1, $report['summary']['payment_count']);
        $this->assertNotNull($good);
    }

    public function test_a_cancelled_receipt_number_is_still_used_up_for_suggestions(): void
    {
        $sub = $this->subscriber();
        $admin = $this->user('admin');
        $first = Payment::create([
            'subscriber_id' => $sub->subscriber_id, 'amount' => 100, 'payment_date' => '2026-10-02',
            'or_number' => '41001', 'payment_method' => 'Cash', 'recorded_by' => $admin->id,
        ]);
        Payment::create([
            'subscriber_id' => $sub->subscriber_id, 'amount' => 100, 'payment_date' => '2026-10-02',
            'or_number' => '41002', 'payment_method' => 'Cash', 'recorded_by' => $this->user('secretary')->id,
            'voided_at' => now(),
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/payments/next-or-number')->assertOk()->assertJsonPath('data.suggestion', '41003');
        $this->assertNotNull($first);
    }

    public function test_a_subscriber_sees_their_cancelled_payments_marked_as_such(): void
    {
        $sub = $this->subscriber();
        $login = User::create(['subscriber_id' => $sub->subscriber_id, 'name' => 'Ana Cruz', 'contact_number' => '09171112222', 'password' => 'abcd1234', 'role' => 'subscriber', 'account_status' => 'active']);
        $this->pay($sub, 500, 'OR-1');
        $bad = $this->pay($sub, 5000, 'OR-2');
        $bad->forceFill(['voided_at' => now(), 'void_reason' => 'Typed the wrong amount'])->save();
        Sanctum::actingAs($login);

        $mine = $this->getJson('/api/me/payments')->assertOk()->json('data');

        $this->assertCount(2, $mine);
        $this->assertNotNull(collect($mine)->firstWhere('or_number', 'OR-2')['voided_at']);
        // Their balance leaves the cancelled one out.
        $this->assertSame(1000.0, (float) $this->getJson('/api/me/billing')->assertOk()->json('data.balance'));
    }

    public function test_cancelling_a_payment_asks_for_the_password_even_right_after_signing_in(): void
    {
        $sub = $this->subscriber();
        $payment = $this->pay($sub, 500);
        DB::table('users')->insert([
            'name' => 'Boss', 'email' => 'boss@void.test', 'password' => bcrypt('void-pass-123'), 'role' => 'admin',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $token = $this->postJson('/api/login', ['login' => 'boss@void.test', 'password' => 'void-pass-123'])->assertOk()->json('token');

        // The sign-in itself does not count: the password has to be typed again for a cancel.
        $this->withToken($token)->postJson("/api/payments/{$payment->id}/void", ['reason' => 'Typed the wrong amount'])->assertStatus(423);
        $this->assertNull(Payment::find($payment->id)->voided_at);

        $this->withToken($token)->postJson('/api/me/confirm-password', ['password' => 'void-pass-123'])->assertOk();
        $this->withToken($token)->postJson("/api/payments/{$payment->id}/void", ['reason' => 'Typed the wrong amount'])->assertOk();
    }
}
