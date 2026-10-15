<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The barangays of Palayan City (Wikipedia and the Barangay Directory, October 2026), so the address list starts
 * complete. Anything already on the list is kept as it is; the company can still edit the list in Settings.
 * "Malete" (the spelling the system started with) is corrected to "Malate" when nothing else uses that name.
 */
return new class extends Migration
{
    private const NAMES = [
        'Atate', 'Aulo', 'Bagong Buhay', 'Bo. Militar', 'Caballero', 'Caimito', 'Doña Josefa', 'Ganaderia',
        'Imelda Valley I', 'Imelda Valley II', 'Langka', 'Malate', 'Maligaya', 'Manacnac', 'Mapait',
        'Marcos Village', 'Popolon Pagas', 'Santolan', 'Sapang Buho', 'Singalat',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('barangays')) {
            return;
        }

        $old = DB::table('barangays')->where('name', 'Malete')->first();
        if ($old && ! DB::table('barangays')->where('name', 'Malate')->exists()) {
            DB::table('barangays')->where('id', $old->id)->update(['name' => 'Malate', 'updated_at' => now()]);
            if (Schema::hasColumn('subscribers', 'barangay')) {
                DB::table('subscribers')->where('barangay', 'Malete')->update(['barangay' => 'Malate']);
                DB::table('subscribers')->where('address', 'like', 'Malete,%')->update(['address' => DB::raw("REPLACE(address, 'Malete,', 'Malate,')")]);
            }
        }

        $order = (int) DB::table('barangays')->max('sort_order');
        foreach (self::NAMES as $name) {
            if (! DB::table('barangays')->where('name', $name)->exists()) {
                DB::table('barangays')->insert(['name' => $name, 'is_active' => true, 'sort_order' => ++$order, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
    }

    public function down(): void {}
};
