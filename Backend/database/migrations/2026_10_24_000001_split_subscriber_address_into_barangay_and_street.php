<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * An address is now a barangay chosen from the admin's list, an optional street, and the fixed city (Palayan
 * City). The full address text is still kept in `address`, so every list, search and report keeps working.
 *
 * Existing addresses are split where they match "<street, >Barangay, Palayan City" with a barangay on the
 * list. Anything else (free text typed in the past) is left exactly as it is, with no barangay, and is
 * marked for the person to re-select the next time that subscriber is edited.
 */
return new class extends Migration
{
    private const CITY = 'Palayan City';

    public function up(): void
    {
        Schema::table('subscriber', function (Blueprint $table) {
            $table->string('barangay', 60)->nullable()->after('address')->index();
            $table->string('street', 120)->nullable()->after('barangay');
        });

        $names = DB::table('barangays')->pluck('name')->all();
        if ($names === []) {
            return;
        }

        DB::table('subscriber')->whereNotNull('address')->orderBy('subscriber_id')->each(function ($row) use ($names) {
            foreach ($names as $name) {
                $suffix = ', '.$name.', '.self::CITY;
                $exact = $name.', '.self::CITY;

                if (strcasecmp($row->address, $exact) === 0) {
                    DB::table('subscriber')->where('subscriber_id', $row->subscriber_id)->update(['barangay' => $name]);

                    return;
                }
                if (str_ends_with(strtolower($row->address), strtolower($suffix))) {
                    $street = trim(substr($row->address, 0, strlen($row->address) - strlen($suffix)));
                    DB::table('subscriber')->where('subscriber_id', $row->subscriber_id)
                        ->update(['barangay' => $name, 'street' => $street !== '' ? mb_substr($street, 0, 120) : null]);

                    return;
                }
            }
        }, 200, 'subscriber_id');
    }

    public function down(): void
    {
        Schema::table('subscriber', function (Blueprint $table) {
            $table->dropColumn(['barangay', 'street']);
        });
    }
};
