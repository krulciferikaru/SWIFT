<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditTrailTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role, ?string $email = null): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role).' Tester',
            'email' => $email ?? "{$role}@audit.test",
            'password' => bcrypt('correct-horse-battery'),
            'role' => $role,
            'account_status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    public function test_creating_a_plan_is_recorded_with_who_did_it(): void
    {
        $secretary = $this->makeUser('secretary');
        Sanctum::actingAs($secretary);

        $this->postJson('/api/plans', [
            'plan_name' => 'Audit Plan',
            'monthly_rate' => 500,
            'description' => 'x',
        ])->assertCreated();

        $log = AuditLog::where('action', 'plan.created')->firstOrFail();
        $this->assertSame($secretary->id, $log->user_id);
        $this->assertSame('secretary', $log->user_role);
        $this->assertSame('Audit Plan', $log->subject_label);
    }

    public function test_plan_update_records_old_and_new_values(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        $plan = Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 400, 'description' => 'x']);

        $this->putJson("/api/plans/{$plan->plan_id}", [
            'plan_name' => 'Basic',
            'monthly_rate' => 450,
            'description' => 'x',
        ])->assertOk();

        $log = AuditLog::where('action', 'plan.updated')->firstOrFail();
        $this->assertEquals(400, $log->changes['monthly_rate']['old']);
        $this->assertEquals(450, $log->changes['monthly_rate']['new']);
    }

    public function test_failed_and_successful_logins_are_recorded(): void
    {
        $this->makeUser('admin', 'who@audit.test');

        $this->postJson('/api/login', ['login' => 'who@audit.test', 'password' => 'wrong'])->assertStatus(401);
        $this->postJson('/api/login', ['login' => 'who@audit.test', 'password' => 'correct-horse-battery'])->assertOk();

        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.login_failed', 'subject_label' => 'who@audit.test']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.login']);
    }

    public function test_passwords_never_appear_in_the_log(): void
    {
        Sanctum::actingAs($admin = $this->makeUser('admin'));
        $staff = $this->makeUser('secretary');

        $this->patchJson("/api/users/{$staff->id}/password", [
            'password' => 'brand-new-secret-1',
            'password_confirmation' => 'brand-new-secret-1',
        ])->assertOk();

        $log = AuditLog::where('action', 'user.password_reset')->firstOrFail();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertStringNotContainsString('brand-new-secret-1', json_encode($log->toArray()));
    }

    public function test_only_admin_can_read_the_audit_trail(): void
    {
        Sanctum::actingAs($this->makeUser('secretary'));
        $this->getJson('/api/audit-logs')->assertForbidden();
    }

    public function test_admin_can_filter_the_audit_trail(): void
    {
        Sanctum::actingAs($this->makeUser('admin'));
        AuditLog::create(['action' => 'plan.created', 'user_name' => 'A', 'subject_label' => 'Gold']);
        AuditLog::create(['action' => 'subscriber.updated', 'user_name' => 'B', 'subject_label' => 'Juan']);

        $this->getJson('/api/audit-logs?action=plan')
            ->assertOk()
            ->assertJsonCount(1, 'data.data');

        $this->getJson('/api/audit-logs?search=Juan')
            ->assertOk()
            ->assertJsonPath('data.data.0.action', 'subscriber.updated');
    }
}
