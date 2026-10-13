<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The barangays an address can be chosen from, kept in the database so an admin can change the list
 * in Settings instead of asking a developer. An address is saved as "<name>, Palayan City".
 *
 * It starts with the five the system has always offered; the rest of Palayan City's barangays are
 * for the company to add.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barangays', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60)->unique();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();
        foreach (['Malete', 'Santolan', 'Caballero', 'Ganaderia', 'Caimito'] as $i => $name) {
            DB::table('barangays')->insert(['name' => $name, 'is_active' => true, 'sort_order' => $i + 1, 'created_at' => $now, 'updated_at' => $now]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('barangays');
    }
};
