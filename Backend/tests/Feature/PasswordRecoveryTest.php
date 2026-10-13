<?php

namespace Tests\Feature;

use App\Models\PasswordResetCode;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PasswordRecoveryTest extends TestCase
{
    use RefreshDatabase;

    private ?string $sentCode = null;
    private int $texts = 0;
    private bool $smsFails = false;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false, 'services.philsms.token' => 'test-token']);
        Http::fake(function ($request) {
            $this->texts++;
            if ($this->smsFails) {
                return Http::response(['status' => 'error'], 500);
            }
            if (preg_match('/code is (\d{6})/', $request['message'], $m)) {
                $this->sentCode = $m[1];
            }

            return Http::response(['status' => 'success']);
        });
    }

    private function subscriberUser(string $phone = '09171234567', bool $verified = true, string $status = 'active'): User
    {
        $sub = Subscriber::create(['name' => 'Juan Cruz', 'contact_number' => $phone, 'connection_date' => '2026-01-10',
            'account_status' => 'active', 'status' => 'Active']);
        $id = DB::table('users')->insertGetId([
            'name' => 'Juan Cruz', 'email' => null, 'contact_number' => $phone, 'password' => bcrypt('old-password-1'),
            'role' => 'subscriber', 'subscriber_id' => $sub->subscriber_id, 'account_status' => $status,
            'contact_verified_at' => $verified ? now() : null, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function forgot(string $login)
    {
        return $this->postJson('/api/password/forgot', ['login' => $login]);
    }

    private function reset(string $login, string $code, string $password = 'brand-new-pass-1')
    {
        return $this->postJson('/api/password/reset', [
            'login' => $login, 'code' => $code, 'password' => $password, 'password_confirmation' => $password,
        ]);
    }

    public function test_a_verified_number_gets_a_code_and_can_set_a_new_password(): void
    {
        $user = $this->subscriberUser();

        $this->forgot('09171234567')->assertOk();
        $this->assertNotNull($this->sentCode);

        $this->reset('09171234567', $this->sentCode)->assertOk();

        $this->postJson('/api/login', ['login' => '09171234567', 'password' => 'brand-new-pass-1'])->assertOk();
        $this->postJson('/api/login', ['login' => '09171234567', 'password' => 'old-password-1'])->assertStatus(401);
        $this->assertSame(0, PasswordResetCode::count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.password_reset', 'user_id' => $user->id]);
        $this->assertSame(2, $this->texts); // the code, then "your password was changed"
    }

    public function test_the_number_can_be_typed_in_any_common_format(): void
    {
        $this->subscriberUser('0917-123-4567');

        $this->forgot('+63 917 123 4567')->assertOk();
        $this->assertNotNull($this->sentCode);
    }

    public function test_asking_for_a_code_looks_identical_whether_or_not_it_can_work(): void
    {
        $this->subscriberUser('09171234567');
        $this->subscriberUser('09170000002', verified: false);

        $known = $this->forgot('09171234567')->assertOk()->json('message');
        $texts = $this->texts;
        $unverified = $this->forgot('09170000002')->assertOk()->json('message');
        $unknown = $this->forgot('09179999999')->assertOk()->json('message');

        $this->assertSame($known, $unverified);
        $this->assertSame($known, $unknown);
        $this->assertSame($texts, $this->texts, 'no text may go to an unverified or unknown number');
    }

    public function test_inactive_and_archived_accounts_cannot_recover_a_password(): void
    {
        $this->subscriberUser('09170000003', status: 'inactive');
        $archived = $this->subscriberUser('09170000004');
        $archived->subscriber->delete();

        $this->forgot('09170000003');
        $this->forgot('09170000004');

        $this->assertSame(0, $this->texts);
    }

    public function test_a_wrong_code_fails_and_five_misses_burn_the_code(): void
    {
        $this->subscriberUser();
        $this->forgot('09171234567');
        $wrong = $this->sentCode === '000000' ? '111111' : '000000';

        for ($i = 0; $i < 5; $i++) {
            $this->reset('09171234567', $wrong)->assertStatus(422);
        }

        $this->reset('09171234567', $this->sentCode)->assertStatus(422);
    }

    public function test_an_expired_code_fails(): void
    {
        $this->subscriberUser();
        $this->forgot('09171234567');

        $this->travel(11)->minutes();

        $this->reset('09171234567', $this->sentCode)->assertStatus(422);
    }

    public function test_a_failed_reset_says_the_same_thing_for_unknown_numbers(): void
    {
        $this->subscriberUser();

        $unknown = $this->reset('09179999999', '123456')->assertStatus(422)->json('message');
        $this->forgot('09171234567');
        $wrong = $this->reset('09171234567', $this->sentCode === '123456' ? '654321' : '123456')->assertStatus(422)->json('message');

        $this->assertSame($unknown, $wrong);
    }

    public function test_codes_cannot_be_requested_faster_than_once_a_minute(): void
    {
        $this->subscriberUser();

        $this->forgot('09171234567');
        $first = $this->sentCode;
        $this->forgot('09171234567');

        $this->assertSame(1, $this->texts);
        $this->assertSame($first, $this->sentCode);
    }

    public function test_no_more_than_three_codes_per_number_in_ten_minutes(): void
    {
        $this->subscriberUser();

        for ($i = 0; $i < 6; $i++) {
            $this->forgot('09171234567');
            $this->travel(61)->seconds();
        }

        $this->assertLessThanOrEqual(3, $this->texts);
    }

    public function test_a_failed_text_leaves_no_code_behind(): void
    {
        $this->subscriberUser();
        $this->smsFails = true;

        $this->forgot('09171234567')->assertOk();

        $this->assertSame(0, PasswordResetCode::count());
    }

    public function test_a_reset_signs_out_every_device_and_lifts_a_lockout(): void
    {
        $user = $this->subscriberUser();
        $token = $user->createToken('device')->plainTextToken;
        RateLimiter::hit('login-failures:09171234567', 900);
        RateLimiter::hit('login-failures:09171234567', 900);

        $this->forgot('09171234567');
        $this->reset('09171234567', $this->sentCode)->assertOk();

        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame(0, RateLimiter::attempts('login-failures:09171234567'));
        $this->assertNotNull($token);
    }

    public function test_the_new_password_must_be_long_enough_and_confirmed(): void
    {
        $this->subscriberUser();
        $this->forgot('09171234567');

        $this->reset('09171234567', $this->sentCode, 'short')->assertStatus(422);
        $this->postJson('/api/password/reset', [
            'login' => '09171234567', 'code' => $this->sentCode, 'password' => 'brand-new-pass-1', 'password_confirmation' => 'different',
        ])->assertStatus(422);
    }

    // ---- nobody resets another person's password

    private function staffUser(string $role, string $email, ?string $phone = null, bool $verified = false): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => $email, 'password' => bcrypt('old-password-1'), 'role' => $role,
            'contact_number' => $phone, 'contact_verified_at' => $verified ? now() : null,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    public function test_there_is_no_way_for_an_admin_to_reset_someone_elses_password(): void
    {
        Sanctum::actingAs($admin = $this->staffUser('admin', 'admin@own.test'));
        $secretary = $this->staffUser('secretary', 'sec@own.test');
        $this->postJson('/api/me/confirm-password', ['password' => 'old-password-1'])->assertOk();

        $this->patchJson("/api/users/{$secretary->id}/password", ['password' => 'sneaky-pass-1', 'password_confirmation' => 'sneaky-pass-1'])
            ->assertNotFound();
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('old-password-1', $secretary->fresh()->password));
    }

    public function test_staff_can_add_verify_and_then_use_forgot_password(): void
    {
        $this->staffUser('secretary', 'sec@own.test');
        $sec = User::where('email', 'sec@own.test')->first();
        Sanctum::actingAs($sec);
        $this->passwordConfirmed($sec); // changing the number asks for the password

        $this->patchJson('/api/me/mobile-number', ['contact_number' => '0917 555 0100'])->assertOk();
        $this->assertNull(User::where('email', 'sec@own.test')->first()->contact_verified_at);

        // Not verified yet: no code is sent.
        $this->forgot('09175550100')->assertOk();
        $this->assertNull($this->sentCode);

        User::where('email', 'sec@own.test')->update(['contact_verified_at' => now()]);
        $this->forgot('09175550100')->assertOk();
        $this->assertNotNull($this->sentCode);
        $this->reset('09175550100', $this->sentCode)->assertOk();
        $this->postJson('/api/login', ['login' => 'sec@own.test', 'password' => 'brand-new-pass-1'])->assertOk();
    }

    public function test_changing_a_staff_number_clears_its_verification_and_it_must_be_a_mobile_number(): void
    {
        $user = $this->staffUser('admin', 'adm@own.test', '09171110000', true);
        $this->staffUser('secretary', 'other@own.test', '09172220000');
        Sanctum::actingAs($user);
        $this->passwordConfirmed($user);

        $this->patchJson('/api/me/mobile-number', ['contact_number' => '12345'])->assertStatus(422);
        $this->patchJson('/api/me/mobile-number', ['contact_number' => '09172220000'])->assertStatus(422); // someone else's
        $this->patchJson('/api/me/mobile-number', ['contact_number' => '09173330000'])->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('09173330000', $fresh->contact_number);
        $this->assertNull($fresh->contact_verified_at);
    }

    public function test_a_subscriber_cannot_change_their_number_this_way(): void
    {
        $subscriber = $this->subscriberUser('09170000007');
        Sanctum::actingAs($subscriber);
        $this->passwordConfirmed($subscriber);

        $this->patchJson('/api/me/mobile-number', ['contact_number' => '09173330000'])->assertForbidden();
    }

    public function test_a_new_staff_account_may_be_given_a_mobile_number(): void
    {
        Sanctum::actingAs($this->staffUser('admin', 'boss@own.test'));

        $this->postJson('/api/users', [
            'name' => 'New Secretary', 'email' => 'new@own.test', 'role' => 'secretary', 'contact_number' => '0917 444 0000',
            'password' => 'first-password-1', 'password_confirmation' => 'first-password-1',
        ])->assertCreated();

        $this->assertSame('0917 444 0000', User::where('email', 'new@own.test')->value('contact_number'));
    }
}
