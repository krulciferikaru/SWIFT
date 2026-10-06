<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed demo accounts and sample report data for development and testing.
     *
     * This must never put known credentials on a live system, so in production it
     * does nothing unless ALLOW_DEMO_SEED=true is set, and then it requires a
     * SEED_DEMO_PASSWORD of your own. To create a real admin, use
     * `php artisan swift:create-admin` instead.
     */
    public function run(): void
    {
        $production = app()->isProduction();

        if ($production && ! config('seeding.allow_demo_seed')) {
            $this->command?->error('Refusing to create demo accounts and sample data in production. Use "php artisan swift:create-admin" to make a real admin account.');

            return;
        }

        $password = config('seeding.demo_password') ?: ($production ? null : 'abcd1234');

        if (! $password) {
            $this->command?->error('Set SEED_DEMO_PASSWORD to a password of your own before seeding demo accounts in production.');

            return;
        }

        User::updateOrCreate([
            'email' => 'admin@swift.test',
        ], [
            'name' => 'SWIFT Admin',
            'password' => Hash::make($password),
            'role' => 'admin',
            'account_status' => 'active',
        ]);

        User::updateOrCreate([
            'email' => 'secretary@swift.test',
        ], [
            'name' => 'SWIFT Secretary',
            'password' => Hash::make($password),
            'role' => 'secretary',
            'account_status' => 'active',
        ]);

        $this->call(SampleReportDataSeeder::class);
    }
}
