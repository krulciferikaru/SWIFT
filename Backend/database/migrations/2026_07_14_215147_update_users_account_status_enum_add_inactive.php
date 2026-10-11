<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: widen the enum to include 'inactive' alongside the existing values
        $this->setStatuses(['pending', 'active', 'rejected', 'inactive']);

        // Step 2: migrate any existing 'rejected' staff rows to 'inactive'
        DB::table('users')->where('account_status', 'rejected')->update(['account_status' => 'inactive']);

        // Step 3: narrow the enum to drop 'rejected' now that no rows use it
        $this->setStatuses(['pending', 'active', 'inactive']);
    }

    public function down(): void
    {
        $this->setStatuses(['pending', 'active', 'rejected', 'inactive']);

        DB::table('users')->where('account_status', 'inactive')->update(['account_status' => 'rejected']);

        $this->setStatuses(['pending', 'active', 'rejected']);
    }

    // MySQL changes the column in place. SQLite (used by the test suite) has no
    // MODIFY, so go through the schema builder, which rebuilds the table.
    private function setStatuses(array $values): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('users', function (Blueprint $table) use ($values) {
                $table->enum('account_status', $values)->default('pending')->change();
            });

            return;
        }

        $list = "'" . implode("','", $values) . "'";
        DB::statement("ALTER TABLE users MODIFY account_status ENUM($list) NOT NULL DEFAULT 'pending'");
    }
};
