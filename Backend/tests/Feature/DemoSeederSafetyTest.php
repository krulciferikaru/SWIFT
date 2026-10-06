<?php

namespace Tests\Feature;

use App\Models\Subscriber;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DemoSeederSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function asProduction(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
    }

    // Run the seeder directly: in production `db:seed` itself asks for confirmation first.
    private function runSeeder(): void
    {
        app(DatabaseSeeder::class)->setContainer($this->app)->run();
    }

    public function test_demo_seeder_still_works_for_local_development(): void
    {
        $this->seed(DatabaseSeeder::class);

        $admin = User::where('email', 'admin@swift.test')->first();
        $this->assertNotNull($admin);
        $this->assertSame('admin', $admin->role);
    }

    public function test_demo_seeder_does_nothing_in_production_by_default(): void
    {
        $this->asProduction();

        $this->runSeeder();

        $this->assertSame(0, User::where('email', 'like', '%@swift.test')->count());
    }

    public function test_demo_seeder_in_production_needs_a_password_of_your_own(): void
    {
        $this->asProduction();
        config(['seeding.allow_demo_seed' => true, 'seeding.demo_password' => null]);

        $this->runSeeder();

        $this->assertSame(0, User::where('email', 'like', '%@swift.test')->count());
    }

    public function test_demo_seeder_in_production_uses_the_chosen_password_not_a_known_one(): void
    {
        $this->asProduction();
        config(['seeding.allow_demo_seed' => true, 'seeding.demo_password' => 'a-long-private-password-1']);

        $this->runSeeder();

        $admin = User::where('email', 'admin@swift.test')->firstOrFail();
        $this->assertTrue(Hash::check('a-long-private-password-1', $admin->password));
        $this->assertFalse(Hash::check('abcd1234', $admin->password));
    }

    public function test_create_admin_command_makes_an_active_admin(): void
    {
        $this->artisan('swift:create-admin', ['--name' => 'Real Admin', '--email' => 'real-admin@example.test'])
            ->expectsQuestion('Password (at least 12 characters)', 'correct-horse-battery')
            ->expectsQuestion('Confirm password', 'correct-horse-battery')
            ->assertSuccessful();

        $admin = User::where('email', 'real-admin@example.test')->firstOrFail();
        $this->assertSame('admin', $admin->role);
        $this->assertSame('active', $admin->account_status);
        $this->assertTrue(Hash::check('correct-horse-battery', $admin->password));
    }

    public function test_create_admin_command_rejects_a_short_password(): void
    {
        $this->artisan('swift:create-admin', ['--name' => 'Weak Admin', '--email' => 'weak@example.test'])
            ->expectsQuestion('Password (at least 12 characters)', 'short')
            ->expectsQuestion('Confirm password', 'short')
            ->assertFailed();

        $this->assertSame(0, User::where('email', 'weak@example.test')->count());
    }

    public function test_approving_a_subscriber_without_a_password_does_not_use_a_known_default(): void
    {
        $adminId = DB::table('users')->insertGetId([
            'name' => 'Approver',
            'email' => 'approver@example.test',
            'password' => 'not-a-real-hash',
            'role' => 'admin',
            'account_status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Sanctum::actingAs(User::findOrFail($adminId));

        $subscriber = Subscriber::create([
            'name' => 'No Password Person',
            'contact_number' => '09170000123',
            'email' => 'nopass@example.test',
            'account_status' => 'pending',
            'status' => 'Unpaid',
        ]);

        $this->patchJson("/api/subscribers/{$subscriber->subscriber_id}/approve")->assertOk();

        $user = User::where('subscriber_id', $subscriber->subscriber_id)->firstOrFail();
        $this->assertFalse(Hash::check('password', $user->password));
    }
}
