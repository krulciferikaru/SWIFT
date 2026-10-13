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

    public function test_deleting_an_account_removes_only_the_login_and_leaves_the_subscribers_record_alone(): void
    {
        [$user, $subscriber] = $this->subscriberWithLogin();
        Sanctum::actingAs($user);

        $this->postJson('/api/me/delete-account', ['password' => 'my-password-1', 'reason' => 'moved', 'detail' => 'Moving to Cebu'])
            ->assertOk();

        // Only the login is gone.
        $this->assertNull(User::find($user->id));

        // The subscriber's record is exactly as it was: still in the lists, nothing cleared, nothing archived.
        $row = Subscriber::findOrFail($subscriber->subscriber_id);
        $this->assertFalse($row->trashed());
        $this->assertSame('Ana Cruz', $row->name);
        $this->assertSame('Malete, Palayan City', $row->address);
        $this->assertSame('09171112222', $row->contact_number);
        $this->assertSame('ana@x.test', $row->email);
        $this->assertSame('AA:BB:CC:DD:EE:FF', $row->mac_address);
        $this->assertSame('active', $row->account_status);
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

    public function test_the_old_sign_in_stops_working_and_coming_back_means_claiming_the_record(): void
    {
        [$user] = $this->subscriberWithLogin();
        $token = $user->createToken('auth_token')->plainTextToken;

        $this->withToken($token)->postJson('/api/me/delete-account', ['password' => 'my-password-1'])->assertOk();
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
        $this->postJson('/api/login', ['login' => '09171112222', 'password' => 'my-password-1'])->assertStatus(401);

        // The record still has this number, so registering again is a claim that staff verify.
        $this->postJson('/api/register', [
            'first_name' => 'Ana', 'last_name' => 'Cruz', 'address' => 'Malete, Palayan City', 'contact_number' => '09171112222',
            'password' => 'another-pass-1', 'password_confirmation' => 'another-pass-1', 'accept_terms' => true,
        ])->assertStatus(201)->assertJsonPath('claim', true);
    }

    public function test_staff_see_the_note_in_the_subscriber_list_and_details(): void
    {
        [$user, $subscriber] = $this->subscriberWithLogin();
        Sanctum::actingAs($user);
        $this->postJson('/api/me/delete-account', ['password' => 'my-password-1', 'reason' => 'moved'])->assertOk();
        $adminId = DB::table('users')->insertGetId([
            'name' => 'Admin', 'email' => 'admin3@del.test', 'password' => bcrypt('x'), 'role' => 'admin',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs(User::findOrFail($adminId));

        $row = collect($this->getJson('/api/subscribers')->assertOk()->json('data.data'))->firstWhere('subscriber_id', $subscriber->subscriber_id);
        $this->assertSame('moved', $row['deletion']['reason']);
        $this->getJson("/api/subscribers/{$subscriber->subscriber_id}")->assertOk()->assertJsonPath('data.deletion.reason', 'moved');
    }

    public function test_no_more_texts_go_to_someone_who_deleted_their_account(): void
    {
        [$user, $subscriber] = $this->subscriberWithLogin();
        Sanctum::actingAs($user);
        $this->postJson('/api/me/delete-account', ['password' => 'my-password-1'])->assertOk();
        Http::fake(['*' => Http::response(['status' => 'success'])]);
        config(['services.philsms.token' => 'test-token']);

        $result = app(\App\Services\PhilSmsService::class)->sendToSubscriber($subscriber->fresh(), 'Reminder');

        $this->assertFalse($result['success']);
        Http::assertNothingSent();
    }

    public function test_coming_back_by_claiming_the_record_ends_the_note_and_texts_resume(): void
    {
        [$user, $subscriber] = $this->subscriberWithLogin();
        Sanctum::actingAs($user);
        $this->postJson('/api/me/delete-account', ['password' => 'my-password-1'])->assertOk();
        $this->app['auth']->forgetGuards();

        $this->postJson('/api/register', [
            'first_name' => 'Ana', 'last_name' => 'Cruz', 'address' => 'Malete, Palayan City', 'contact_number' => '09171112222',
            'password' => 'another-pass-1', 'password_confirmation' => 'another-pass-1', 'accept_terms' => true,
        ])->assertStatus(201);
        $claim = User::where('contact_number', '09171112222')->firstOrFail();
        $staff = User::create(['name' => 'S', 'email' => 's@del.test', 'password' => 'abcd1234', 'role' => 'secretary', 'account_status' => 'active']);
        Sanctum::actingAs($staff);
        $this->patchJson("/api/subscribers/claims/{$claim->id}/approve")->assertOk();

        $this->assertSame(0, AccountDeletion::where('subscriber_id', $subscriber->subscriber_id)->count());
        config(['services.philsms.token' => 'test-token']);
        $this->assertTrue(app(\App\Services\PhilSmsService::class)->sendToSubscriber($subscriber->fresh(), 'Reminder')['success']);
    }

    public function test_if_staff_archive_such_a_record_the_archive_still_shows_the_note(): void
    {
        [$user, $subscriber] = $this->subscriberWithLogin();
        Sanctum::actingAs($user);
        $this->postJson('/api/me/delete-account', ['password' => 'my-password-1', 'reason' => 'price'])->assertOk();
        $subscriber->delete(); // staff archive it later

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
