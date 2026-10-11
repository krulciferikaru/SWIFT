<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name', 50)->unique();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // The three methods the system always had.
        $now = now();
        foreach (['Cash', 'GCash', 'Others'] as $i => $name) {
            DB::table('payment_methods')->insert([
                'name' => $name, 'is_active' => true, 'sort_order' => $i + 1, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        // Payments used to be limited to those three by the column itself. Now they just hold
        // the method's name, and the list of allowed names lives in payment_methods.
        $this->setMethodColumn(true);
    }

    public function down(): void
    {
        DB::table('payments')->whereNotIn('payment_method', ['Cash', 'GCash', 'Others'])->update(['payment_method' => 'Others']);
        $this->setMethodColumn(false);

        Schema::dropIfExists('payment_methods');
    }

    private function setMethodColumn(bool $asText): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('payments', function (Blueprint $table) use ($asText) {
                $asText
                    ? $table->string('payment_method', 50)->default('Cash')->change()
                    : $table->enum('payment_method', ['Cash', 'GCash', 'Others'])->default('Cash')->change();
            });

            return;
        }

        DB::statement($asText
            ? "ALTER TABLE payments MODIFY payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash'"
            : "ALTER TABLE payments MODIFY payment_method ENUM('Cash','GCash','Others') NOT NULL DEFAULT 'Cash'");
    }
};
