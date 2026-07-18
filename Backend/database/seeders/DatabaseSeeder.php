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
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate([
            'email' => 'admin@swift.test',
        ], [
            'name' => 'SWIFT Admin',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'account_status' => 'active',
        ]);

        User::updateOrCreate([
            'email' => 'secretary@swift.test',
        ], [
            'name' => 'SWIFT Secretary',
            'password' => Hash::make('password'),
            'role' => 'secretary',
            'account_status' => 'active',
        ]);

        $this->call(SampleReportDataSeeder::class);
    }
}
