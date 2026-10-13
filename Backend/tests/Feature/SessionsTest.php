<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Ending sign-ins: "sign out of every other place", and an Inactive account stops working at once. */
class SessionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['mfa.enforce_for_admins' => false, 'ratelimit.enabled' => false]);
    }

    private function user(string $role, string $email, string $status = 'active'): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => $email, 'password' => bcrypt('pass-12345'), 'role' => $role,
            'account_status' => $status, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    public function test_signing_out_of_other_places_keeps_this_one(): void
    {
        $user = $this->user('secretary', 'sec@s.test');
        $phone = $user->createToken('phone')->plainTextToken;
        $thief = $user->createToken('thief')->plainTextToken;
        $mine = $user->createToken('mine')->plainTextToken;

        $this->withToken($mine)->postJson('/api/me/sessions/end-others')
            ->assertOk()->assertJsonPath('count', 2);

        $this->assertSame(1, $user->tokens()->count());
        $this->assertSame('mine', $user->tokens()->first()->name);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.sessions_ended']);

        // The ended ones no longer work; this one does.
        $this->app['auth']->forgetGuards();
        $this->withToken($thief)->getJson('/api/me')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->withToken($mine)->getJson('/api/me')->assertOk();
    }

    public function test_it_works_for_every_role_and_says_so_when_there_is_nothing_to_end(): void
    {
        foreach (['admin', 'collector', 'subscriber'] as $role) {
            $user = $this->user($role, "$role@s.test");
            $mine = $user->createToken('mine')->plainTextToken;

            $this->withToken($mine)->postJson('/api/me/sessions/end-others')
                ->assertOk()->assertJsonPath('count', 0);
            $this->app['auth']->forgetGuards();
        }
    }

    public function test_it_needs_a_sign_in(): void
    {
        $this->postJson('/api/me/sessions/end-others')->assertUnauthorized();
    }

    public function test_switching_an_account_to_inactive_ends_its_open_sign_ins(): void
    {
        $admin = $this->user('admin', 'boss@s.test');
        $secretary = $this->user('secretary', 'sec@s.test');
        $secretary->createToken('one');
        $secretary->createToken('two');
        Sanctum::actingAs($admin);

        $this->patchJson("/api/users/{$secretary->id}/status", ['account_status' => 'inactive'])->assertOk();

        $this->assertSame(0, $secretary->tokens()->count());
    }

    public function test_an_inactive_account_with_a_sign_in_still_open_is_refused(): void
    {
        $user = $this->user('collector', 'col@s.test');
        $token = $user->createToken('open')->plainTextToken;
        DB::table('users')->where('id', $user->id)->update(['account_status' => 'inactive']); // changed behind the scenes

        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_switching_back_to_active_does_not_sign_anyone_out(): void
    {
        $admin = $this->user('admin', 'boss@s.test');
        $secretary = $this->user('secretary', 'sec@s.test', 'inactive');
        $secretary->createToken('new');
        Sanctum::actingAs($admin);

        $this->patchJson("/api/users/{$secretary->id}/status", ['account_status' => 'active'])->assertOk();

        $this->assertSame(1, $secretary->tokens()->count());
    }
}
