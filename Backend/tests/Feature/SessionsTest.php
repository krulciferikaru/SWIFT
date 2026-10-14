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

    private function signInFrom(string $email, string $agent, string $ip)
    {
        return $this->withHeader('User-Agent', $agent)->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson('/api/login', ['login' => $email, 'password' => 'pass-12345'])->assertOk()->json('token');
    }

    public function test_the_list_shows_each_place_with_a_device_name_a_hidden_address_and_which_is_this_one(): void
    {
        $this->user('secretary', 'sec@s.test');
        $laptop = $this->signInFrom('sec@s.test', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', '203.0.113.45');
        $phone = $this->signInFrom('sec@s.test', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1', '198.51.100.7');

        $this->app['auth']->forgetGuards();
        $rows = $this->withToken($phone)->getJson('/api/me/sessions')->assertOk()->json('data');

        $this->assertCount(2, $rows);
        $byDevice = collect($rows)->keyBy('device');
        $this->assertSame('203.0.113.•', $byDevice['Chrome on Windows']['network']);
        $this->assertFalse($byDevice['Chrome on Windows']['is_current']);
        $this->assertTrue($byDevice['Safari on iPhone']['is_current']);
        // The full address is never sent to the browser.
        $this->assertStringNotContainsString('203.0.113.45', json_encode($rows));
    }

    public function test_one_other_place_can_be_ended_but_not_this_one_and_not_someone_elses(): void
    {
        $this->user('secretary', 'sec@s.test');
        $other = $this->user('collector', 'col@s.test');
        $laptop = $this->signInFrom('sec@s.test', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36', '203.0.113.45');
        $mine = $this->signInFrom('sec@s.test', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.2 Safari/605.1.15', '203.0.113.46');
        $strangers = $other->createToken('theirs')->accessToken->id;

        $this->app['auth']->forgetGuards();
        $rows = $this->withToken($mine)->getJson('/api/me/sessions')->json('data');
        $laptopId = collect($rows)->firstWhere('device', 'Chrome on Windows')['id'];
        $mineId = collect($rows)->firstWhere('is_current', true)['id'];

        $this->deleteJson("/api/me/sessions/{$mineId}", [], ['Authorization' => "Bearer {$mine}"])->assertStatus(422);
        $this->deleteJson("/api/me/sessions/{$strangers}", [], ['Authorization' => "Bearer {$mine}"])->assertNotFound();
        $this->deleteJson("/api/me/sessions/{$laptopId}", [], ['Authorization' => "Bearer {$mine}"])->assertOk();

        $this->assertSame(1, User::where('email', 'sec@s.test')->first()->tokens()->count());
        $this->assertSame(1, $other->tokens()->count()); // theirs untouched
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.session_ended']);
    }

    public function test_a_missing_record_gets_a_plain_message_not_the_internal_model_name(): void
    {
        Sanctum::actingAs($this->user('secretary', 'sec@s.test'));

        $res = $this->getJson('/api/subscribers/999999/billing')->assertNotFound();

        $this->assertSame('That could not be found. It may have been removed.', $res->json('message'));
        $this->assertStringNotContainsString('App', $res->getContent());
    }
}
