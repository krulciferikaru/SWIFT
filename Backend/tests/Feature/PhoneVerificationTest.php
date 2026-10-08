<?php

namespace Tests\Feature;

use App\Models\PhoneVerification;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PhoneVerificationTest extends TestCase
{
    use RefreshDatabase;

    private ?string $sentCode = null;

    private bool $smsFails = false;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.philsms.token' => 'test-token']);
        Http::fake(function ($request) {
            if ($this->smsFails) {
                return Http::response(['status' => 'error', 'message' => 'nope'], 500);
            }

            preg_match('/code is (\d{6})/', $request['message'], $m);
            $this->sentCode = $m[1] ?? null;

            return Http::response(['status' => 'success']);
        });
    }

    private function subscriberUser(string $phone = '09171234567'): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Juan Cruz',
            'email' => null,
            'contact_number' => $phone,
            'password' => 'x',
            'role' => 'subscriber',
            'account_status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    public function test_a_correct_code_verifies_the_number(): void
    {
        $user = $this->subscriberUser();
        Sanctum::actingAs($user);

        $this->postJson('/api/me/phone/send-code')->assertOk();
        $this->assertNotNull($this->sentCode);

        $this->postJson('/api/me/phone/verify', ['code' => $this->sentCode])
            ->assertOk()
            ->assertJsonPath('user.contact_verified', true);

        $this->assertNotNull($user->fresh()->contact_verified_at);
        $this->assertSame(0, PhoneVerification::count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'phone.verified']);
    }

    public function test_the_code_is_stored_hashed(): void
    {
        Sanctum::actingAs($this->subscriberUser());
        $this->postJson('/api/me/phone/send-code')->assertOk();

        $this->assertNotSame($this->sentCode, PhoneVerification::first()->code_hash);
    }

    public function test_a_wrong_code_is_rejected_and_five_misses_burn_the_code(): void
    {
        $user = $this->subscriberUser();
        Sanctum::actingAs($user);
        $this->postJson('/api/me/phone/send-code')->assertOk();
        $wrong = $this->sentCode === '000000' ? '111111' : '000000';

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/me/phone/verify', ['code' => $wrong])->assertStatus(422);
        }

        // Even the right code no longer works after five misses.
        $this->postJson('/api/me/phone/verify', ['code' => $this->sentCode])->assertStatus(422);
        $this->assertNull($user->fresh()->contact_verified_at);
    }

    public function test_an_expired_code_is_rejected(): void
    {
        $user = $this->subscriberUser();
        Sanctum::actingAs($user);
        $this->postJson('/api/me/phone/send-code')->assertOk();

        $this->travel(11)->minutes();

        $this->postJson('/api/me/phone/verify', ['code' => $this->sentCode])
            ->assertStatus(422)
            ->assertJsonPath('message', 'That code has expired. Request a new one.');
    }

    public function test_codes_cannot_be_resent_within_a_minute(): void
    {
        Sanctum::actingAs($this->subscriberUser());

        $this->postJson('/api/me/phone/send-code')->assertOk();
        $this->postJson('/api/me/phone/send-code')->assertStatus(429);

        $this->travel(61)->seconds();
        $this->postJson('/api/me/phone/send-code')->assertOk();
    }

    public function test_changing_the_number_clears_verification(): void
    {
        $user = $this->subscriberUser();
        $user->forceFill(['contact_verified_at' => now()])->save();

        $user->update(['contact_number' => '09179998888']);

        $this->assertNull($user->fresh()->contact_verified_at);
    }

    public function test_failed_sms_does_not_leave_a_code_behind(): void
    {
        $this->smsFails = true;
        Sanctum::actingAs($this->subscriberUser());

        $this->postJson('/api/me/phone/send-code')->assertStatus(503);
        $this->assertSame(0, PhoneVerification::count());
    }

    public function test_staff_see_whether_a_subscribers_number_is_verified(): void
    {
        $staffId = DB::table('users')->insertGetId([
            'name' => 'Admin', 'email' => 'a@v.test', 'password' => 'x', 'role' => 'admin',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $sub = Subscriber::create([
            'name' => 'Juan Cruz', 'contact_number' => '09171234567',
            'account_status' => 'active', 'status' => 'Active',
        ]);
        $user = $this->subscriberUser('09171234567');
        $user->forceFill(['subscriber_id' => $sub->subscriber_id, 'contact_verified_at' => now()])->save();

        Sanctum::actingAs(User::findOrFail($staffId));

        $this->getJson('/api/subscribers')->assertJsonPath('data.data.0.contact_verified', true);

        // If staff change the number on the record, it is no longer the verified one.
        $sub->update(['contact_number' => '09170000000']);
        $this->getJson('/api/subscribers')->assertJsonPath('data.data.0.contact_verified', false);
    }

    public function test_a_user_without_a_number_cannot_request_a_code(): void
    {
        $user = $this->subscriberUser();
        $user->forceFill(['contact_number' => null])->save();
        Sanctum::actingAs($user);

        $this->postJson('/api/me/phone/send-code')->assertStatus(422);
    }
}
