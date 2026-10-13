<?php

namespace Tests\Feature;

use App\Models\Subscriber;
use App\Models\User;
use App\Services\MfaService;
use App\Support\Totp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Two-step sign-in is required for administrators, and optional for secretaries, field collectors and
 * subscribers, who can switch it on, move it to a new phone and switch it off from their own Settings.
 */
class MfaForEveryoneTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['mfa.enforce_for_admins' => true, 'ratelimit.enabled' => false]);
    }

    private function user(string $role, string $email): User
    {
        $subscriberId = null;
        if ($role === 'subscriber') {
            $subscriberId = Subscriber::create(['name' => 'Ana Cruz', 'contact_number' => '09171112222', 'account_status' => 'active', 'status' => 'Active'])->subscriber_id;
        }
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => $email, 'password' => bcrypt('pass-12345'), 'role' => $role,
            'subscriber_id' => $subscriberId, 'contact_number' => $role === 'subscriber' ? '09171112222' : null,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    /** Switches it on for someone the way they would, returning their secret and recovery codes. */
    private function enrol(User $user): array
    {
        $mfa = app(MfaService::class);
        $secret = $mfa->beginSetup($user)['secret'];
        $codes = $mfa->enable($user->fresh(), Totp::code($secret));
        $this->travel(31)->seconds(); // the next code is a new one

        return [$secret, $codes];
    }

    private function login(string $email)
    {
        return $this->postJson('/api/login', ['login' => $email, 'password' => 'pass-12345']);
    }

    #[DataProvider('optionalRoles')]
    public function test_a_person_with_an_optional_role_can_switch_it_on_themselves(string $role): void
    {
        $user = $this->user($role, "$role@mfa.test");
        Sanctum::actingAs($user);
        $this->passwordConfirmed($user);

        $setup = $this->postJson('/api/me/mfa/setup')->assertOk()->json();
        $this->postJson('/api/me/mfa/enable', ['code' => '000000'])->assertStatus(422);

        $res = $this->postJson('/api/me/mfa/enable', ['code' => Totp::code($setup['secret'])])->assertOk();
        $this->assertCount(8, $res->json('recovery_codes'));
        $this->assertTrue($user->fresh()->mfa_enabled);
    }

    public static function optionalRoles(): array
    {
        return [['secretary'], ['collector'], ['subscriber']];
    }

    #[DataProvider('optionalRoles')]
    public function test_once_it_is_on_signing_in_asks_for_the_code(string $role): void
    {
        $user = $this->user($role, "$role@mfa.test");
        [$secret] = $this->enrol($user);

        $first = $this->login("$role@mfa.test")->assertOk()->assertJsonPath('mfa_required', true);
        $this->assertArrayNotHasKey('token', $first->json());

        $this->postJson('/api/login/mfa', ['mfa_token' => $first->json('mfa_token'), 'code' => '000000'])->assertStatus(422);
        $this->postJson('/api/login/mfa', ['mfa_token' => $first->json('mfa_token'), 'code' => Totp::code($secret)])
            ->assertOk()->assertJsonStructure(['token']);
    }

    public function test_someone_who_has_not_turned_it_on_signs_in_as_before_and_is_never_forced(): void
    {
        $this->user('secretary', 'sec@mfa.test');

        $this->login('sec@mfa.test')->assertOk()->assertJsonStructure(['token'])->assertJsonPath('user.mfa_setup_required', false);
    }

    public function test_an_optional_role_can_switch_it_off_with_a_code_but_the_password_alone_is_not_enough(): void
    {
        $user = $this->user('secretary', 'sec@mfa.test');
        [$secret] = $this->enrol($user);
        Sanctum::actingAs($user->fresh());
        $this->passwordConfirmed($user);

        $this->deleteJson('/api/me/mfa', ['code' => '000000'])->assertStatus(422);
        $this->assertTrue($user->fresh()->mfa_enabled);

        $this->deleteJson('/api/me/mfa', ['code' => Totp::code($secret)])->assertOk();
        $fresh = $user->fresh();
        $this->assertFalse($fresh->mfa_enabled);
        $this->assertNull($fresh->mfa_secret);
        $this->login('sec@mfa.test')->assertOk()->assertJsonStructure(['token']);
    }

    public function test_a_recovery_code_can_also_switch_it_off(): void
    {
        $user = $this->user('collector', 'col@mfa.test');
        [, $codes] = $this->enrol($user);
        Sanctum::actingAs($user->fresh());
        $this->passwordConfirmed($user);

        $this->deleteJson('/api/me/mfa', ['code' => $codes[0]])->assertOk();
        $this->assertFalse($user->fresh()->mfa_enabled);
    }

    public function test_an_administrator_can_never_switch_it_off(): void
    {
        $admin = $this->user('admin', 'boss@mfa.test');
        [$secret] = $this->enrol($admin);
        Sanctum::actingAs($admin->fresh());
        $this->passwordConfirmed($admin);

        $this->deleteJson('/api/me/mfa', ['code' => Totp::code($secret)])->assertForbidden();
        $this->assertTrue($admin->fresh()->mfa_enabled);
    }

    public function test_it_can_be_moved_to_a_new_phone_and_the_old_one_stops_working(): void
    {
        $user = $this->user('admin', 'boss@mfa.test');
        [$oldSecret] = $this->enrol($user);
        Sanctum::actingAs($user->fresh());
        $this->passwordConfirmed($user);

        // Needs a current code from the old phone.
        $this->postJson('/api/me/mfa/replace', ['code' => '000000'])->assertStatus(422);
        $new = $this->postJson('/api/me/mfa/replace', ['code' => Totp::code($oldSecret)])->assertOk()->json();
        $this->assertNotSame($oldSecret, $new['secret']);

        // Until the new phone proves itself, the old one still works.
        $this->assertSame($oldSecret, $user->fresh()->mfa_secret);

        $this->postJson('/api/me/mfa/replace/confirm', ['code' => '000000'])->assertStatus(422);
        $codes = $this->postJson('/api/me/mfa/replace/confirm', ['code' => Totp::code($new['secret'])])->assertOk()->json('recovery_codes');
        $this->assertCount(8, $codes);
        $this->assertSame($new['secret'], $user->fresh()->mfa_secret);

        $this->travel(31)->seconds();
        $first = $this->login('boss@mfa.test')->json('mfa_token');
        $this->postJson('/api/login/mfa', ['mfa_token' => $first, 'code' => Totp::code($oldSecret)])->assertStatus(422);
        $this->postJson('/api/login/mfa', ['mfa_token' => $first, 'code' => Totp::code($new['secret'])])->assertOk();
    }

    public function test_moving_to_a_new_phone_needs_it_to_be_on_and_the_password_confirmed(): void
    {
        $user = $this->user('secretary', 'sec@mfa.test');
        Sanctum::actingAs($user);

        $this->postJson('/api/me/mfa/replace', ['code' => '123456'])->assertStatus(423); // password first
        $this->passwordConfirmed($user);
        $this->postJson('/api/me/mfa/replace', ['code' => '123456'])->assertStatus(422);    // not on yet
        $this->postJson('/api/me/mfa/replace/confirm', ['code' => '123456'])->assertStatus(422);
    }

    public function test_an_administrator_can_reset_someone_who_lost_their_phone(): void
    {
        $secretary = $this->user('secretary', 'sec@mfa.test');
        $this->enrol($secretary);
        $secretary->createToken('x');
        $admin = $this->user('admin', 'boss@mfa.test');
        $this->enrol($admin); // an administrator has to have it set up to do anything
        Sanctum::actingAs($admin->fresh());

        $this->postJson("/api/users/{$secretary->id}/mfa/reset")->assertStatus(423); // password first
        $this->passwordConfirmed($admin);
        $this->postJson("/api/users/{$secretary->id}/mfa/reset")->assertOk();

        $this->assertFalse($secretary->fresh()->mfa_enabled);
        $this->assertSame(0, $secretary->tokens()->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.mfa_reset']);

        $this->postJson("/api/users/{$secretary->id}/mfa/reset")->assertStatus(422); // nothing left to reset
        $this->postJson("/api/users/{$admin->id}/mfa/reset")->assertStatus(422);      // not your own
    }

    public function test_only_an_administrator_can_reset_it_for_someone_else(): void
    {
        $other = $this->user('collector', 'col@mfa.test');
        $this->enrol($other);
        Sanctum::actingAs($this->user('secretary', 'sec@mfa.test'));

        $this->postJson("/api/users/{$other->id}/mfa/reset")->assertForbidden();
        $this->assertTrue($other->fresh()->mfa_enabled);
    }
    public function test_switching_it_on_or_changing_the_mobile_number_asks_for_the_password_even_right_after_signing_in(): void
    {
        $this->user('collector', 'col@mfa.test');
        $token = $this->login('col@mfa.test')->json('token');

        // The sign-in itself does not count for these two: someone at a device left signed in could otherwise do them.
        $this->withToken($token)->postJson('/api/me/mfa/setup')->assertStatus(423);
        $this->withToken($token)->patchJson('/api/me/mobile-number', ['contact_number' => '09175551234'])->assertStatus(423);
        $this->assertNull(User::where('email', 'col@mfa.test')->value('mfa_secret'));

        $this->withToken($token)->postJson('/api/me/confirm-password', ['password' => 'pass-12345'])->assertOk();
        $this->withToken($token)->postJson('/api/me/mfa/setup')->assertOk();
        $this->withToken($token)->patchJson('/api/me/mobile-number', ['contact_number' => '09175551234'])->assertOk();
    }

    public function test_an_administrators_required_first_setup_still_counts_the_sign_in(): void
    {
        $this->user('admin', 'boss@mfa.test');
        $token = $this->login('boss@mfa.test')->json('token');

        $this->withToken($token)->postJson('/api/me/mfa/setup')->assertOk();
    }

    public function test_with_a_stolen_phone_a_recovery_code_can_move_it_to_a_new_one_and_ends_other_sessions(): void
    {
        $admin = $this->user('admin', 'boss@mfa.test');
        [$oldSecret, $codes] = $this->enrol($admin);
        $thiefSession = $admin->createToken('thief')->plainTextToken;
        $mine = $admin->createToken('mine')->plainTextToken;

        $this->withToken($mine)->postJson('/api/me/confirm-password', ['password' => 'pass-12345'])->assertOk();

        // No code from the (stolen) phone, only a recovery code.
        $new = $this->withToken($mine)->postJson('/api/me/mfa/replace', ['code' => $codes[0]])->assertOk()->json();
        $this->withToken($mine)->postJson('/api/me/mfa/replace/confirm', ['code' => Totp::code($new['secret'])])->assertOk();

        // The stolen phone no longer works, the recovery code is used up, and the other session is gone.
        $this->travel(31)->seconds();
        $first = $this->login('boss@mfa.test')->json('mfa_token');
        $this->postJson('/api/login/mfa', ['mfa_token' => $first, 'code' => Totp::code($oldSecret)])->assertStatus(422);
        $this->assertSame(0, $admin->tokens()->where('name', 'thief')->count());
        $this->assertSame(1, $admin->tokens()->where('name', 'mine')->count());
        $this->assertFalse(app(MfaService::class)->check($admin->fresh(), $codes[0]) === 'recovery');
    }

    public function test_after_a_reset_staff_have_to_set_it_up_again_and_nothing_else_opens_until_they_do(): void
    {
        $secretary = $this->user('secretary', 'sec@mfa.test');
        [$secret] = $this->enrol($secretary);
        $admin = $this->user('admin', 'boss@mfa.test');
        $this->enrol($admin);
        Sanctum::actingAs($admin->fresh());
        $this->passwordConfirmed($admin);

        $this->postJson("/api/users/{$secretary->id}/mfa/reset")->assertOk()->assertJsonPath('message', fn ($m) => str_contains($m, 'set it up again'));
        $this->assertTrue($secretary->fresh()->mfa_setup_required);

        // At the next sign-in they can do nothing but set it up.
        $this->app['auth']->forgetGuards();
        $login = $this->login('sec@mfa.test')->assertOk()->assertJsonPath('user.mfa_setup_required', true);
        $token = $login->json('token');
        $this->withToken($token)->getJson('/api/subscribers')->assertStatus(403)->assertJsonPath('mfa_setup_required', true);

        $this->withToken($token)->postJson('/api/me/confirm-password', ['password' => 'pass-12345'])->assertOk();
        $setup = $this->withToken($token)->postJson('/api/me/mfa/setup')->assertOk()->json();
        $this->withToken($token)->postJson('/api/me/mfa/enable', ['code' => Totp::code($setup['secret'])])->assertOk();

        $this->assertFalse($secretary->fresh()->mfa_setup_required);
        $this->withToken($token)->getJson('/api/subscribers')->assertOk();
    }

    public function test_a_subscriber_who_is_reset_is_not_forced_to_set_it_up_again(): void
    {
        $subscriber = $this->user('subscriber', 'sub@mfa.test');
        $this->enrol($subscriber);
        $admin = $this->user('admin', 'boss@mfa.test');
        $this->enrol($admin);
        Sanctum::actingAs($admin->fresh());
        $this->passwordConfirmed($admin);

        $this->postJson("/api/users/{$subscriber->id}/mfa/reset")->assertOk();

        $this->assertFalse($subscriber->fresh()->mfa_setup_required);
    }
}
