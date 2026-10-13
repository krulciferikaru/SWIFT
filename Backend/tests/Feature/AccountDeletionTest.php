<?php

namespace Tests\Feature;

use App\Models\AccountDeletion;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDeletionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false]);
        Http::fake(['*' => Http::response(['status' => 'success'])]);
    }

    /** @return array{0: User, 1: Subscriber} */
    private function subscriberWithLogin(string $phone = '09171112222'): array
    {
        $plan = Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 500, 'speed_mbps' => 10, 'status' => 'Active']);
        $subscriber = Subscriber::create([
            'plan_id' => $plan->plan_id, 'name' => 'Ana Cruz', 'address' => 'Malete, Palayan City',
            'contact_number' => $phone, 'email' => 'ana@x.test', 'mac_address' => 'AA:BB:CC:DD:EE:FF',
            'connection_date' => '2026-01-10', 'account_status' => 'active', 'status' => 'Unpaid',
        ]);
        Payment::create(['subscriber_id' => $subscriber->subscriber_id, 'amount' => 500, 'payment_date' => '2026-03-01', 'or_number' => 'OR1', 'payment_method' => 'Cash']);
        $user = User::create([
            'subscriber_id' => $subscriber->subscriber_id, 'name' => 'Ana Cruz', 'email' => 'ana@x.test', 'contact_number' => $phone,
            'password' => 'my-password-1', 'role' => 'subscriber', 'account_status' => 'active',
        ]);

        return [$user, $subscriber];
    }

    public function test_deleting_an_account_removes_the_login_and_contact_details_but_keeps_the_billing_record(): void
    {
        [$user, $subscriber] = $this->subscriberWithLogin();
        Sanctum::actingAs($user);

        $this->postJson('/api/me/delete-account', ['password' => 'my-password-1', 'reason' => 'moved', 'detail' => 'Moving to Cebu'])
            ->assertOk();

        // The login is gone and so is everything that identifies how to reach them.
        $this->assertNull(User::find($user->id));
        $row = Subscriber::withTrashed()->findOrFail($subscriber->subscriber_id);
        $this->assertNull($row->contact_number);
        $this->assertNull($row->email);
        $this->assertNull($row->mac_address);
        $this->assertNull($row->password);

        // The billing record stays, archived: name, address, plan, installation date and payments.
        $this->assertTrue($row->trashed());
        $this->assertSame('Ana Cruz', $row->name);
        $this->assertSame('Malete, Palayan City', $row->address);
        $this->assertNotNull($row->plan_id);
        $this->assertSame(1, Payment::where('subscriber_id', $subscriber->subscriber_id)->count());

        // Why, kept as a short note.
        $note = AccountDeletion::firstOrFail();
        $this->assertSame('moved', $note->reason);
        $this->assertSame('Moving to Cebu', $note->detail);
        $this->assertSame($subscriber->subscriber_id, $note->subscriber_id);
    }

    public function test_it_is_written_to_the_audit_trail_with_who_did_it(): void
    {
        [$user] = $this->subscriberWithLogin();
        Sanctum::actingAs($user);

        $this->postJson('/api/me/delete-account', ['password' => 'my-password-1'])->assertOk();

        $this->assertDatabaseHas('audit_logs', ['action' => 'account.deleted_by_owner', 'user_id' => $user->id, 'subject_label' => 'Ana Cruz']);
    }

    public function test_a_wrong_password_deletes_nothing(): void
    {
        [$user, $subscriber] = $this->subscriberWithLogin();
        Sanctum::actingAs($user);

        $this->postJson('/api/me/delete-account', ['password' => 'wrong'])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->assertNotNull(User::find($user->id));
        $this->assertFalse(Subscriber::withTrashed()->find($subscriber->subscriber_id)->trashed());
        $this->assertSame(0, AccountDeletion::count());
        $this->postJson('/api/me/delete-account', [])->assertStatus(422);
    }

    public function test_only_the_listed_reasons_are_accepted_and_the_reason_is_optional(): void
    {
        [$user] = $this->subscriberWithLogin();
        Sanctum::actingAs($user);

        $this->postJson('/api/me/delete-account', ['password' => 'my-password-1', 'reason' => 'because'])->assertStatus(422);
        $this->postJson('/api/me/delete-account', ['password' => 'my-password-1', 'detail' => str_repeat('x', 501)])->assertStatus(422);
        $this->postJson('/api/me/delete-account', ['password' => 'my-password-1'])->assertOk();
    }

    public function test_staff_cannot_delete_their_account_this_way(): void
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Admin', 'email' => 'admin@del.test', 'password' => bcrypt('admin-pass-1'), 'role' => 'admin',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);
        Sanctum::actingAs(User::findOrFail($id));

        $this->postJson('/api/me/delete-account', ['password' => 'admin-pass-1'])->assertForbidden();
        $this->assertNotNull(User::find($id));
    }

    public function test_the_old_sign_in_stops_working_and_the_number_can_register_again(): void
    {
        [$user] = $this->subscriberWithLogin();
        $token = $user->createToken('auth_token')->plainTextToken;

        $this->withToken($token)->postJson('/api/me/delete-account', ['password' => 'my-password-1'])->assertOk();
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
        $this->postJson('/api/login', ['login' => '09171112222', 'password' => 'my-password-1'])->assertStatus(401);

        $this->postJson('/api/register', [
            'first_name' => 'Ana', 'last_name' => 'Cruz', 'address' => 'Malete, Palayan City', 'contact_number' => '09171112222',
            'password' => 'another-pass-1', 'password_confirmation' => 'another-pass-1', 'accept_terms' => true,
        ])->assertStatus(201);
    }

    public function test_the_archive_says_which_subscribers_deleted_their_own_account(): void
    {
        [$user, $subscriber] = $this->subscriberWithLogin();
        Sanctum::actingAs($user);
        $this->postJson('/api/me/delete-account', ['password' => 'my-password-1', 'reason' => 'price'])->assertOk();

        $adminId = DB::table('users')->insertGetId([
            'name' => 'Admin', 'email' => 'admin2@del.test', 'password' => bcrypt('x'), 'role' => 'admin',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs(User::findOrFail($adminId));

        $row = $this->getJson('/api/archive/subscribers')->assertOk()->json('data.data.0');
        $this->assertSame('price', $row['deletion']['reason']);
    }

    public function test_the_reasons_can_be_listed(): void
    {
        [$user] = $this->subscriberWithLogin();
        Sanctum::actingAs($user);

        $values = collect($this->getJson('/api/me/delete-account/reasons')->assertOk()->json('data'))->pluck('value')->all();
        $this->assertContains('privacy', $values);
        $this->assertContains('other', $values);
    }
}
