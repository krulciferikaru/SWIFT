<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CollectorSpeedupsTest extends TestCase
{
    use RefreshDatabase;

    private function staff(string $role = 'admin'): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => uniqid().'@c.test', 'password' => 'x', 'role' => $role,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function subscriber(string $name, string $status, string $installed, ?Plan $plan = null): Subscriber
    {
        return Subscriber::create([
            'name' => $name, 'contact_number' => '0917'.random_int(1000000, 9999999),
            'account_status' => 'active', 'status' => $status, 'connection_date' => $installed,
            'plan_id' => ($plan ?? Plan::firstOrCreate(['plan_name' => 'Basic'], ['monthly_rate' => 500, 'speed_mbps' => 10, 'status' => 'Active']))->plan_id,
        ]);
    }

    private function pay(User $by, Subscriber $sub, string $or): void
    {
        Payment::create([
            'subscriber_id' => $sub->subscriber_id, 'amount' => 100, 'payment_date' => '2026-10-01',
            'or_number' => $or, 'payment_method' => 'Cash', 'recorded_by' => $by->id,
        ]);
    }

    // ---- next OR number

    public function test_the_next_or_number_follows_the_last_one_this_person_recorded(): void
    {
        $me = $this->staff();
        $other = $this->staff('secretary');
        $sub = $this->subscriber('Ana', 'Active', '2026-01-10');
        $this->pay($me, $sub, 'OR-00041');
        $this->pay($other, $sub, '99999'); // someone else's book does not count
        Sanctum::actingAs($me);

        $this->getJson('/api/payments/next-or-number')->assertOk()->assertJsonPath('data.suggestion', 'OR-00042');
    }

    public function test_the_suggestion_keeps_plain_numbers_and_skips_ones_already_used(): void
    {
        $me = $this->staff();
        $sub = $this->subscriber('Ana', 'Active', '2026-01-10');
        $this->pay($me, $sub, '41001');
        $this->pay($this->staff('secretary'), $sub, '41002'); // already taken by someone else
        Sanctum::actingAs($me);

        $this->getJson('/api/payments/next-or-number')->assertOk()->assertJsonPath('data.suggestion', '41003');
    }

    public function test_there_is_no_suggestion_without_history_or_digits(): void
    {
        $me = $this->staff();
        Sanctum::actingAs($me);
        $this->getJson('/api/payments/next-or-number')->assertOk()->assertJsonPath('data.suggestion', null);

        $this->pay($me, $this->subscriber('Ana', 'Active', '2026-01-10'), 'ABC');
        $this->getJson('/api/payments/next-or-number')->assertOk()->assertJsonPath('data.suggestion', null);
    }

    // ---- reminders to the people picked

    private function fakeSms(): void
    {
        config(['services.philsms.token' => 'test-token']);
        Http::fake(['*' => Http::response(['status' => 'success'])]);
    }

    public function test_reminders_go_only_to_the_picked_people_who_owe_something(): void
    {
        $this->fakeSms();
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
        $owes = $this->subscriber('Owes', 'Unpaid', '2026-07-10');            // billed Aug to Oct, paid nothing
        $alsoOwes = $this->subscriber('Also Owes', 'Unpaid', '2026-07-10');
        $notPicked = $this->subscriber('Not Picked', 'Unpaid', '2026-07-10');
        $paidUp = $this->subscriber('Paid Up', 'Active', '2026-07-10');
        Payment::create(['subscriber_id' => $paidUp->subscriber_id, 'amount' => 5000, 'payment_date' => '2026-10-01', 'or_number' => 'X1', 'payment_method' => 'Cash']);
        Sanctum::actingAs($this->staff());

        $res = $this->postJson('/api/subscribers/send-reminders', [
            'subscriber_ids' => [$owes->subscriber_id, $alsoOwes->subscriber_id, $paidUp->subscriber_id],
        ])->assertOk();

        $this->assertSame(2, $res->json('data.sent'));
        $this->assertSame(1, $res->json('data.skipped'));
        Http::assertSentCount(2);
        $this->assertNotNull($notPicked); // exists, but was not messaged
    }

    public function test_without_a_list_every_unpaid_subscriber_with_a_balance_is_still_reminded(): void
    {
        $this->fakeSms();
        $this->travelTo(now('Asia/Manila')->setDate(2026, 10, 14)->setTime(12, 0));
        $this->subscriber('One', 'Unpaid', '2026-07-10');
        $this->subscriber('Two', 'Unpaid', '2026-07-10');
        $this->subscriber('Fine', 'Active', '2026-07-10');
        Sanctum::actingAs($this->staff());

        $res = $this->postJson('/api/subscribers/send-reminders')->assertOk();

        $this->assertSame(2, $res->json('data.sent'));
        Http::assertSentCount(2);
    }

    public function test_the_picked_list_is_validated(): void
    {
        Sanctum::actingAs($this->staff());

        $this->postJson('/api/subscribers/send-reminders', ['subscriber_ids' => 'not-a-list'])->assertStatus(422);
        $this->postJson('/api/subscribers/send-reminders', ['subscriber_ids' => ['abc']])->assertStatus(422);
    }
}
