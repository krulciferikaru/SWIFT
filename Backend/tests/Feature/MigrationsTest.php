<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MigrationsTest extends TestCase
{
    use RefreshDatabase;

    // The suite runs on in-memory SQLite, so every migration must work there,
    // not only on MySQL.
    public function test_all_migrations_run_on_sqlite(): void
    {
        $this->assertTrue(Schema::hasTable('users'));
        $this->assertTrue(Schema::hasTable('subscriber'));
    }

    public function test_users_can_have_inactive_account_status(): void
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'Staff Member',
            'email' => 'staff@example.test',
            'password' => 'not-a-real-hash',
            'role' => 'secretary',
            'account_status' => 'inactive',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertSame('inactive', DB::table('users')->where('id', $id)->value('account_status'));
    }

    public function test_users_default_to_pending_account_status(): void
    {
        $id = DB::table('users')->insertGetId([
            'name' => 'New User',
            'email' => 'new@example.test',
            'password' => 'not-a-real-hash',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->assertSame('pending', DB::table('users')->where('id', $id)->value('account_status'));
    }
}
