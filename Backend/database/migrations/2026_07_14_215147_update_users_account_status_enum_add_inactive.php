<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: widen the enum to include 'inactive' alongside the existing values
        DB::statement("ALTER TABLE users MODIFY account_status ENUM('pending','active','rejected','inactive') NOT NULL DEFAULT 'pending'");

        // Step 2: migrate any existing 'rejected' staff rows to 'inactive'
        DB::table('users')->where('account_status', 'rejected')->update(['account_status' => 'inactive']);

        // Step 3: narrow the enum to drop 'rejected' now that no rows use it
        DB::statement("ALTER TABLE users MODIFY account_status ENUM('pending','active','inactive') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY account_status ENUM('pending','active','rejected','inactive') NOT NULL DEFAULT 'pending'");

        DB::table('users')->where('account_status', 'inactive')->update(['account_status' => 'rejected']);

        DB::statement("ALTER TABLE users MODIFY account_status ENUM('pending','active','rejected') NOT NULL DEFAULT 'pending'");
    }
};