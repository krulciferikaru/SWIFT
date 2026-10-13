<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Sensitive actions (changing permissions, deleting for good) need the
 * person to retype their own password, even though they are signed in.
 */
class PasswordConfirmationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false]);
    }

    private function user(string $role, string $email): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => $email, 'password' => bcrypt('admin-pass-123'), 'role' => $role,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    public function test_sensitive_actions_ask_for_the_password_first(): void
    {
        Sanctum::actingAs($this->user('admin', 'admin@sec.test'));
        $secretary = $this->user('secretary', 'sec@sec.test');

        $this->patchJson("/api/users/{$secretary->id}/permissions", ['permissions' => []])
            ->assertStatus(423)
            ->assertJsonPath('password_confirmation_required', true);
        $this->deleteJson('/api/archive/subscribers/1')->assertStatus(423);
        $this->deleteJson('/api/archive/plans/1')->assertStatus(423);
    }

    public function test_nothing_changes_when_the_password_was_not_confirmed(): void
    {
        Sanctum::actingAs($this->user('admin', 'admin@sec.test'));
        $secretary = $this->user('secretary', 'sec@sec.test');
        $before = $secretary->permissions;

        $this->patchJson("/api/users/{$secretary->id}/permissions", ['permissions' => ['subscribers.view']])
            ->assertStatus(423);

        $this->assertSame($before, $secretary->fresh()->permissions);
    }

    public function test_a_wrong_password_does_not_unlock_them_and_is_logged(): void
    {
        Sanctum::actingAs($this->user('admin', 'admin@sec.test'));

        $this->postJson('/api/me/confirm-password', ['password' => 'nope'])->assertStatus(422);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.confirm_failed']);
        $this->patchJson('/api/users/1/permissions', ['permissions' => []])->assertStatus(423);
    }

    public function test_confirming_unlocks_them_for_ten_minutes_only(): void
    {
        Sanctum::actingAs($this->user('admin', 'admin@sec.test'));
        $secretary = $this->user('secretary', 'sec@sec.test');

        $this->postJson('/api/me/confirm-password', ['password' => 'admin-pass-123'])->assertOk();
        $this->patchJson("/api/users/{$secretary->id}/permissions", ['permissions' => ['subscribers.view']])->assertOk();

        $this->travel(11)->minutes();
        $this->patchJson("/api/users/{$secretary->id}/permissions", ['permissions' => ['subscribers.view', 'plans.manage']])
            ->assertStatus(423);
    }

    public function test_the_confirmation_belongs_to_one_sign_in(): void
    {
        $admin = $this->user('admin', 'admin@sec.test');
        $one = $admin->createToken('a')->plainTextToken;
        $two = $admin->createToken('b')->plainTextToken;

        $this->withToken($one)->postJson('/api/me/confirm-password', ['password' => 'admin-pass-123'])->assertOk();
        $this->app['auth']->forgetGuards();

        $this->withToken($two)->patchJson('/api/users/1/permissions', ['permissions' => []])->assertStatus(423);
    }

    public function test_a_secretary_without_the_permission_is_still_refused_outright(): void
    {
        // The permission check comes first: they are told no, not asked for a password.
        Sanctum::actingAs($this->user('secretary', 'sec2@sec.test'));

        $this->patchJson('/api/users/1/permissions', ['permissions' => []])->assertForbidden();
    }

    public function test_the_password_is_required(): void
    {
        Sanctum::actingAs($this->user('admin', 'admin@sec.test'));

        $this->postJson('/api/me/confirm-password', [])->assertStatus(422);
    }
}
