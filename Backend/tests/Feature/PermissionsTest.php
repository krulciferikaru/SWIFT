<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PermissionsTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role, ?array $permissions = null, ?string $email = null): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role).' Tester',
            'email' => $email ?? uniqid($role).'@perm.test',
            'password' => 'x',
            'role' => $role,
            'account_status' => 'active',
            'permissions' => is_null($permissions) ? null : json_encode($permissions),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    public function test_a_secretary_who_was_never_customised_keeps_every_ability(): void
    {
        Sanctum::actingAs($this->makeUser('secretary'));

        $this->getJson('/api/subscribers')->assertOk();
        $this->getJson('/api/reports/collections?range=monthly&month=2026-10')->assertOk();
        $this->getJson('/api/archive/plans')->assertOk();
        $this->getJson('/api/users')->assertForbidden();
        $this->getJson('/api/audit-logs')->assertForbidden();
    }

    public function test_a_removed_permission_blocks_only_that_ability(): void
    {
        Sanctum::actingAs($this->makeUser('secretary', ['subscribers.view', 'payments.view']));

        $this->getJson('/api/subscribers')->assertOk();
        $this->postJson('/api/subscribers', [])->assertForbidden();
        $this->getJson('/api/reports/collections?range=monthly&month=2026-10')->assertForbidden();
        $this->getJson('/api/archive/subscribers')->assertForbidden();
        $this->postJson('/api/plans', [])->assertForbidden();
        $this->getJson('/api/subscribers/pending')->assertForbidden();
        // Dashboard counts stay available to all staff.
        $this->getJson('/api/subscribers/summary')->assertOk();
    }

    public function test_an_empty_list_means_no_abilities_not_all(): void
    {
        $secretary = $this->makeUser('secretary', []);
        Sanctum::actingAs($secretary);

        $this->assertSame([], $secretary->effective_permissions);
        $this->getJson('/api/subscribers')->assertForbidden();
    }

    public function test_admin_can_always_do_everything(): void
    {
        Sanctum::actingAs($this->makeUser('admin', []));

        $this->getJson('/api/subscribers')->assertOk();
        $this->getJson('/api/audit-logs')->assertOk();
        $this->getJson('/api/users')->assertOk();
    }

    public function test_subscribers_have_no_staff_abilities(): void
    {
        Sanctum::actingAs($this->makeUser('subscriber'));

        $this->getJson('/api/subscribers')->assertForbidden();
        $this->getJson('/api/archive/plans')->assertForbidden();
    }

    public function test_admin_can_change_a_secretarys_permissions_and_it_is_logged(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $secretary = $this->makeUser('secretary');

        $this->patchJson("/api/users/{$secretary->id}/permissions", [
            'permissions' => ['subscribers.view'],
        ])->assertOk()->assertJsonPath('user.effective_permissions', ['subscribers.view']);

        $log = AuditLog::where('action', 'user.permissions_changed')->firstOrFail();
        $this->assertContains('payments.record', $log->changes['removed']);
        $this->assertSame([], $log->changes['added']);

        $this->patchJson("/api/users/{$secretary->id}/permissions", ['permissions' => null])
            ->assertOk()
            ->assertJsonCount(10, 'user.effective_permissions');
    }

    public function test_admin_only_permissions_cannot_be_granted_and_admins_cannot_be_restricted(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $secretary = $this->makeUser('secretary');
        $otherAdmin = $this->makeUser('admin');

        $this->patchJson("/api/users/{$secretary->id}/permissions", ['permissions' => ['users.manage']])
            ->assertStatus(422);
        $this->patchJson("/api/users/{$otherAdmin->id}/permissions", ['permissions' => []])
            ->assertStatus(422);
    }

    public function test_a_secretary_cannot_edit_permissions(): void
    {
        $secretary = $this->makeUser('secretary');
        Sanctum::actingAs($secretary);

        $this->patchJson("/api/users/{$secretary->id}/permissions", ['permissions' => []])->assertForbidden();
        $this->assertNull($secretary->fresh()->permissions);
    }
}
