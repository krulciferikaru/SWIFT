<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** A fourth kind of account: the field collector, who goes out to collect payments. */
return new class extends Migration
{
    public function up(): void
    {
        $this->setRoles(['admin', 'secretary', 'collector', 'subscriber']);
    }

    public function down(): void
    {
        // Collectors have nowhere to go back to; they become secretaries with no extra rights removed.
        DB::table('users')->where('role', 'collector')->update(['role' => 'secretary']);
        $this->setRoles(['admin', 'secretary', 'subscriber']);
    }

    // MySQL changes the column in place. SQLite (used by the tests) has no MODIFY, so the
    // schema builder rebuilds the table instead.
    private function setRoles(array $values): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('users', function (Blueprint $table) use ($values) {
                $table->enum('role', $values)->default('subscriber')->change();
            });

            return;
        }

        $list = "'".implode("','", $values)."'";
        DB::statement("ALTER TABLE users MODIFY role ENUM($list) NOT NULL DEFAULT 'subscriber'");
    }
};
