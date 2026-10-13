<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\MfaService;
use App\Support\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminMfaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['mfa.enforce_for_admins' => true, 'ratelimit.enabled' => false]);
    }

    private function user(string $role = 'admin', string $email = 'boss@mfa.test'): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => $email, 'password' => bcrypt('boss-pass-123'), 'role' => $role,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    /** An administrator who has finished setting up the app. @return array{0: User, 1: string, 2: list<string>} */
    private function enrolledAdmin(string $email = 'boss@mfa.test'): array
    {
        $admin = $this->user('admin', $email);
        $mfa = app(MfaService::class);
        $secret = $mfa->beginSetup($admin)['secret'];
        $codes = $mfa->enable($admin->fresh(), Totp::code($secret));

        return [$admin->fresh(), $secret, $codes];
    }

    private function login(string $email = 'boss@mfa.test')
    {
        return $this->postJson('/api/login', ['login' => $email, 'password' => 'boss-pass-123']);
    }

    // ---- the code maths

    public function test_codes_match_the_published_rfc_6238_examples(): void
    {
        // The test secret from RFC 6238 is the ASCII text 12345678901234567890.
        $secret = Totp::base32Encode('12345678901234567890');

        $this->assertSame('287082', Totp::code($secret, 59));
        $this->assertSame('081804', Totp::code($secret, 1111111109));
        $this->assertSame('050471', Totp::code($secret, 1111111111));
        $this->assertSame('005924', Totp::code($secret, 1234567890));
        $this->assertSame('279037', Totp::code($secret, 2000000000));
    }

    public function test_one_step_either_side_is_accepted_but_not_more(): void
    {
        $secret = Totp::generateSecret();
        $now = 1700000000;

        $this->assertNotNull(Totp::verify($secret, Totp::code($secret, $now), $now));
        $this->assertNotNull(Totp::verify($secret, Totp::code($secret, $now - 30), $now));
        $this->assertNotNull(Totp::verify($secret, Totp::code($secret, $now + 30), $now));
        $this->assertNull(Totp::verify($secret, Totp::code($secret, $now + 90), $now));
        $this->assertNull(Totp::verify($secret, 'abcdef', $now));
        $this->assertNull(Totp::verify($secret, '12345', $now));
    }

    // ---- an administrator must set it up

    public function test_an_admin_without_the_app_can_sign_in_but_do_nothing_else(): void
    {
        $this->user();

        $token = $this->login()->assertOk()->assertJsonPath('user.mfa_setup_required', true)->json('token');

        $this->withToken($token)->getJson('/api/me')->assertOk();
        $this->withToken($token)->getJson('/api/subscribers')
            ->assertStatus(403)->assertJsonPath('mfa_setup_required', true);
        $this->withToken($token)->getJson('/api/dashboard/period?period=month')->assertStatus(403);
    }

    public function test_secretaries_are_not_asked_for_it(): void
    {
        $this->user('secretary', 'sec@mfa.test');

        $this->login('sec@mfa.test')->assertOk()->assertJsonStructure(['token'])->assertJsonPath('user.mfa_setup_required', false);
    }

    public function test_the_password_is_asked_again_once_the_sign_in_is_older_than_ten_minutes(): void
    {
        $this->user();
        $token = $this->login()->json('token');

        $this->travel(11)->minutes();

        $this->withToken($token)->postJson('/api/me/mfa/setup')->assertStatus(423);
        $this->withToken($token)->postJson('/api/me/confirm-password', ['password' => 'boss-pass-123'])->assertOk();
        $this->withToken($token)->postJson('/api/me/mfa/setup')->assertOk();
    }

    public function test_just_signed_in_needs_no_second_password_to_set_it_up_and_then_a_correct_code(): void
    {
        $admin = $this->user();
        $token = $this->login()->json('token');

        // The password was just typed to sign in, so setting up goes straight ahead.

        $setup = $this->withToken($token)->postJson('/api/me/mfa/setup')->assertOk()->json();
        $this->assertArrayHasKey('secret', $setup);
        $this->assertStringStartsWith('otpauth://totp/', $setup['uri']);
        $this->assertFalse($admin->fresh()->mfa_enabled);

        $this->withToken($token)->postJson('/api/me/mfa/enable', ['code' => '000000'])->assertStatus(422);
        $this->assertFalse($admin->fresh()->mfa_enabled);

        $res = $this->withToken($token)->postJson('/api/me/mfa/enable', ['code' => Totp::code($setup['secret'])])->assertOk();
        $this->assertCount(8, $res->json('recovery_codes'));
        $this->assertTrue($admin->fresh()->mfa_enabled);

        // Everything opens up, and it cannot be set up a second time over the top.
        $this->withToken($token)->getJson('/api/subscribers')->assertOk();
        $this->withToken($token)->postJson('/api/me/mfa/setup')->assertStatus(422);
    }

    public function test_the_secret_and_recovery_codes_are_never_sent_to_the_browser(): void
    {
        [$admin] = $this->enrolledAdmin();
        Sanctum::actingAs($admin);

        $me = $this->getJson('/api/me')->assertOk()->json();

        $this->assertTrue($me['mfa_enabled']);
        $this->assertArrayNotHasKey('mfa_secret', $me);
        $this->assertArrayNotHasKey('mfa_recovery_codes', $me);
        $this->assertNotSame($admin->fresh()->getRawOriginal('mfa_secret'), Totp::generateSecret()); // stored encrypted, not as typed
        $this->assertStringNotContainsString($admin->mfa_secret, $admin->fresh()->getRawOriginal('mfa_secret'));
    }

    // ---- signing in with it

    public function test_the_password_alone_does_not_sign_an_enrolled_admin_in(): void
    {
        $this->enrolledAdmin();

        $res = $this->login()->assertOk();

        $this->assertTrue($res->json('mfa_required'));
        $this->assertNull($res->json('token'));
        $this->assertNotEmpty($res->json('mfa_token'));
    }

    public function test_the_right_code_completes_the_sign_in_and_keeps_remember_me(): void
    {
        [, $secret] = $this->enrolledAdmin();
        $this->travel(31)->seconds(); // the code used to enrol is already spent
        $challenge = $this->postJson('/api/login', ['login' => 'boss@mfa.test', 'password' => 'boss-pass-123', 'remember' => true])->json('mfa_token');

        $res = $this->postJson('/api/login/mfa', ['mfa_token' => $challenge, 'code' => Totp::code($secret)])->assertOk();

        $this->assertNotEmpty($res->json('token'));
        $this->assertSame('boss@mfa.test', $res->json('user.email'));
        // "Keep me signed in" was asked for in the first step, so the token lasts days, not an hour.
        $this->assertTrue(now()->addDays(2)->lt($res->json('expires_at')));
    }

    public function test_a_code_cannot_be_used_twice(): void
    {
        [, $secret] = $this->enrolledAdmin();
        $this->travel(31)->seconds();
        $code = Totp::code($secret);

        $first = $this->login()->json('mfa_token');
        $this->postJson('/api/login/mfa', ['mfa_token' => $first, 'code' => $code])->assertOk();

        $second = $this->login()->json('mfa_token');
        $this->postJson('/api/login/mfa', ['mfa_token' => $second, 'code' => $code])->assertStatus(422);
    }

    public function test_wrong_codes_are_counted_and_pause_the_second_step(): void
    {
        [, $secret] = $this->enrolledAdmin();
        $challenge = $this->login()->json('mfa_token');

        $this->postJson('/api/login/mfa', ['mfa_token' => $challenge, 'code' => '111111'])->assertStatus(422)->assertJsonPath('attempts_left', 4);
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/login/mfa', ['mfa_token' => $challenge, 'code' => '111111'])->assertStatus(422);
        }
        $this->postJson('/api/login/mfa', ['mfa_token' => $challenge, 'code' => '111111'])->assertStatus(429)->assertJsonPath('locked', true);

        // Even the right code waits while it is paused.
        $this->travel(31)->seconds();
        $this->postJson('/api/login/mfa', ['mfa_token' => $challenge, 'code' => Totp::code($secret)])->assertStatus(429);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.mfa_failed']);
    }

    public function test_a_recovery_code_works_once(): void
    {
        [, , $codes] = $this->enrolledAdmin();

        $challenge = $this->login()->json('mfa_token');
        $this->postJson('/api/login/mfa', ['mfa_token' => $challenge, 'code' => strtolower($codes[0])])->assertOk()->assertJsonStructure(['token']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.mfa_recovery_used']);

        $again = $this->login()->json('mfa_token');
        $this->postJson('/api/login/mfa', ['mfa_token' => $again, 'code' => $codes[0]])->assertStatus(422);
        $this->postJson('/api/login/mfa', ['mfa_token' => $again, 'code' => $codes[1]])->assertOk();
    }

    public function test_the_challenge_expires_and_cannot_be_made_up(): void
    {
        [, $secret] = $this->enrolledAdmin();
        $challenge = $this->login()->json('mfa_token');

        $this->postJson('/api/login/mfa', ['mfa_token' => 'made-up', 'code' => '123456'])->assertStatus(422)->assertJsonPath('expired', true);

        $this->travel(6)->minutes();
        $this->postJson('/api/login/mfa', ['mfa_token' => $challenge, 'code' => Totp::code($secret)])->assertStatus(422)->assertJsonPath('expired', true);
    }

    // ---- looking after it

    public function test_new_recovery_codes_need_a_code_from_the_app_and_replace_the_old_ones(): void
    {
        [$admin, $secret, $old] = $this->enrolledAdmin();
        Sanctum::actingAs($admin);
        $this->passwordConfirmed($admin);
        $this->travel(31)->seconds();

        $this->postJson('/api/me/mfa/recovery-codes', ['code' => '000000'])->assertStatus(422);
        $new = $this->postJson('/api/me/mfa/recovery-codes', ['code' => Totp::code($secret)])->assertOk()->json('recovery_codes');

        $this->assertCount(8, $new);
        $service = app(MfaService::class);
        $this->assertNull($service->check($admin->fresh(), $old[0])); // an old one no longer works
        $this->assertSame('recovery', $service->check($admin->fresh(), $new[0]));
    }

    public function test_it_is_only_for_administrators(): void
    {
        Sanctum::actingAs($this->user('secretary', 'sec@mfa.test'));

        $this->getJson('/api/me/mfa')->assertForbidden();
        $this->postJson('/api/me/mfa/enable', ['code' => '123456'])->assertForbidden();
    }

    public function test_the_server_command_turns_it_off_for_a_locked_out_admin(): void
    {
        [$admin] = $this->enrolledAdmin();
        $admin->createToken('x');

        $this->assertSame(1, Artisan::call('swift:reset-mfa', ['email' => 'nobody@mfa.test']));
        $this->assertSame(0, Artisan::call('swift:reset-mfa', ['email' => 'boss@mfa.test']));

        $fresh = $admin->fresh();
        $this->assertFalse($fresh->mfa_enabled);
        $this->assertNull($fresh->getRawOriginal('mfa_secret'));
        $this->assertSame(0, $fresh->tokens()->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.mfa_reset']);
        // They set it up again at the next sign-in.
        $this->login()->assertOk()->assertJsonPath('user.mfa_setup_required', true);
    }
}
