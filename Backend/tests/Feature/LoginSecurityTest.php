<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class LoginSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // The per-minute request limiter is a separate safeguard; these tests are about the
        // per-account wrong-password limit.
        config(['ratelimit.enabled' => false]);
        RateLimiter::clear('login-failures:who@lock.test');
    }

    private function makeUser(string $email = 'who@lock.test'): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Lock Tester', 'email' => $email, 'password' => bcrypt('correct-horse-battery'),
            'role' => 'secretary', 'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function attempt(string $login, string $password, bool $remember = false)
    {
        return $this->postJson('/api/login', ['login' => $login, 'password' => $password, 'remember' => $remember]);
    }

    public function test_wrong_passwords_report_how_many_tries_are_left(): void
    {
        $this->makeUser();

        $this->attempt('who@lock.test', 'nope')->assertStatus(401)->assertJsonPath('attempts_left', 4);
        $this->attempt('who@lock.test', 'nope')->assertStatus(401)->assertJsonPath('attempts_left', 3);
    }

    public function test_the_fifth_wrong_password_locks_the_account_with_a_countdown(): void
    {
        $this->makeUser();

        for ($i = 0; $i < 4; $i++) {
            $this->attempt('who@lock.test', 'nope')->assertStatus(401);
        }

        $this->attempt('who@lock.test', 'nope')
            ->assertStatus(429)
            ->assertJsonPath('locked', true)
            ->assertHeader('Retry-After');

        // While locked even the right password is refused, so guessing cannot continue.
        $this->attempt('who@lock.test', 'correct-horse-battery')->assertStatus(429);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.locked']);
    }

    public function test_the_lock_ends_after_the_window(): void
    {
        $this->makeUser();
        for ($i = 0; $i < 5; $i++) {
            $this->attempt('who@lock.test', 'nope');
        }
        $this->attempt('who@lock.test', 'correct-horse-battery')->assertStatus(429);

        $this->travel(16)->minutes();

        $this->attempt('who@lock.test', 'correct-horse-battery')->assertOk();
    }

    public function test_a_correct_password_resets_the_count(): void
    {
        $this->makeUser();
        $this->attempt('who@lock.test', 'nope');
        $this->attempt('who@lock.test', 'nope');
        $this->attempt('who@lock.test', 'correct-horse-battery')->assertOk();

        $this->attempt('who@lock.test', 'nope')->assertStatus(401)->assertJsonPath('attempts_left', 4);
    }

    public function test_one_account_being_locked_does_not_affect_another(): void
    {
        $this->makeUser();
        $this->makeUser('other@lock.test');
        for ($i = 0; $i < 5; $i++) {
            $this->attempt('who@lock.test', 'nope');
        }

        $this->attempt('other@lock.test', 'correct-horse-battery')->assertOk();
    }

    public function test_a_name_that_does_not_exist_is_counted_the_same_way(): void
    {
        // The reply must not reveal whether an account exists.
        $this->attempt('ghost@lock.test', 'nope')->assertStatus(401)->assertJsonPath('attempts_left', 4);
        for ($i = 0; $i < 4; $i++) {
            $this->attempt('ghost@lock.test', 'nope');
        }
        $this->attempt('ghost@lock.test', 'nope')->assertStatus(429);
    }

    public function test_a_normal_sign_in_expires_after_a_working_day(): void
    {
        $this->makeUser();
        $token = $this->attempt('who@lock.test', 'correct-horse-battery')->assertOk()->json('token');

        $this->withToken($token)->getJson('/api/me')->assertOk();

        $this->travel(13)->hours();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
    }

    public function test_keep_me_signed_in_lasts_much_longer(): void
    {
        $this->makeUser();
        $res = $this->attempt('who@lock.test', 'correct-horse-battery', true)->assertOk();
        $token = $res->json('token');

        $this->travel(29)->days();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/me')->assertOk();

        $this->travel(2)->days();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
    }
}
