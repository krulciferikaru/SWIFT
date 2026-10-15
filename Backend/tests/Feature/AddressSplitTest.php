<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** An address is a barangay from the admin's list, an optional street, and the fixed city (Palayan City). */
class AddressSplitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\DB::table("barangays")->whereNotIn("name", ["Malate", "Santolan", "Caballero", "Ganaderia", "Caimito"])->delete(); // the tests start from five
        config(['ratelimit.enabled' => false, 'mfa.enforce_for_admins' => false]);
        Http::fake(['*' => Http::response(['status' => 'success'])]);
    }

    private function staff(string $role = 'secretary'): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => $role.uniqid().'@a.test', 'password' => bcrypt('x'), 'role' => $role,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function plan(): Plan
    {
        return Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 500, 'speed_mbps' => 10, 'status' => 'Active']);
    }

    private function newSubscriber(array $extra = [])
    {
        return $this->postJson('/api/subscribers', [
            'plan_id' => $this->plan()->plan_id, 'name' => 'Ana Cruz', 'contact_number' => '09171112222',
            'connection_date' => '2026-07-10', ...$extra,
        ]);
    }

    public function test_the_helpers_compose_and_split_an_address(): void
    {
        $this->assertSame('12 Rizal St, Malate, Palayan City', Barangay::compose('12 Rizal St', 'Malate'));
        $this->assertSame('Malate, Palayan City', Barangay::compose('', 'Malate'));
        $this->assertSame(['12 Rizal St', 'Malate'], Barangay::split('12 Rizal St, Malate, Palayan City'));
        $this->assertSame([null, 'Caimito'], Barangay::split('caimito, palayan city'));
        $this->assertNull(Barangay::split('Somewhere else entirely'));
        $this->assertNull(Barangay::split('Aulo, Palayan City')); // not on the list
    }

    public function test_staff_add_a_subscriber_with_a_barangay_and_a_street(): void
    {
        Sanctum::actingAs($this->staff());

        $this->newSubscriber(['barangay' => 'Malate', 'street' => '12 Rizal St'])->assertCreated();

        $sub = Subscriber::firstOrFail();
        $this->assertSame('Malate', $sub->barangay);
        $this->assertSame('12 Rizal St', $sub->street);
        $this->assertSame('12 Rizal St, Malate, Palayan City', $sub->address);
    }

    public function test_the_street_is_optional_and_the_older_single_address_text_is_still_understood(): void
    {
        Sanctum::actingAs($this->staff());

        $this->newSubscriber(['barangay' => 'Santolan'])->assertCreated();
        $this->assertSame('Santolan, Palayan City', Subscriber::firstOrFail()->address);

        $this->newSubscriber(['address' => '5 Mabini Ave, Caimito, Palayan City', 'contact_number' => '09173334444', 'email' => 'b@a.test'])->assertCreated();
        $second = Subscriber::where('contact_number', '09173334444')->firstOrFail();
        $this->assertSame('Caimito', $second->barangay);
        $this->assertSame('5 Mabini Ave', $second->street);
    }

    public function test_a_barangay_that_is_not_on_the_list_is_refused(): void
    {
        Sanctum::actingAs($this->staff());

        $this->newSubscriber(['barangay' => 'Atlantis'])->assertStatus(422)->assertJsonValidationErrors('barangay');
        $this->newSubscriber([])->assertStatus(422)->assertJsonValidationErrors('barangay');
        $this->newSubscriber(['address' => 'Somewhere in Cabanatuan'])->assertStatus(422)->assertJsonValidationErrors('barangay');
        $this->assertSame(0, Subscriber::count());
    }

    public function test_editing_changes_the_barangay_and_street_and_rebuilds_the_text(): void
    {
        $admin = $this->staff('admin');
        Sanctum::actingAs($admin);
        $this->newSubscriber(['barangay' => 'Malate', 'street' => '12 Rizal St'])->assertCreated();
        $sub = Subscriber::firstOrFail();

        $this->putJson("/api/subscribers/{$sub->subscriber_id}", ['barangay' => 'Caimito', 'street' => ''])->assertOk();

        $this->assertSame('Caimito, Palayan City', $sub->fresh()->address);
        $this->assertNull($sub->fresh()->street);
    }

    public function test_an_older_free_text_address_is_left_alone_unless_a_barangay_is_chosen(): void
    {
        Sanctum::actingAs($this->staff());
        $sub = Subscriber::create(['name' => 'Old Timer', 'address' => 'Purok 3, Somewhere Else', 'contact_number' => '09175550000', 'account_status' => 'active', 'status' => 'Active']);

        // Renaming them, with the same old address sent back, keeps the old address.
        $this->putJson("/api/subscribers/{$sub->subscriber_id}", ['name' => 'Old Timer Jr', 'address' => 'Purok 3, Somewhere Else'])->assertOk();
        $this->assertSame('Purok 3, Somewhere Else', $sub->fresh()->address);
        $this->assertNull($sub->fresh()->barangay);

        // New loose text is refused: it has to come from the list.
        $this->putJson("/api/subscribers/{$sub->subscriber_id}", ['address' => 'Another Place'])->assertStatus(422);

        // Choosing a barangay replaces it.
        $this->putJson("/api/subscribers/{$sub->subscriber_id}", ['barangay' => 'Santolan', 'street' => 'Purok 3'])->assertOk();
        $this->assertSame('Purok 3, Santolan, Palayan City', $sub->fresh()->address);
    }

    public function test_someone_in_a_barangay_that_was_switched_off_can_still_be_edited(): void
    {
        Sanctum::actingAs($this->staff());
        $this->newSubscriber(['barangay' => 'Ganaderia'])->assertCreated();
        $sub = Subscriber::firstOrFail();
        Barangay::where('name', 'Ganaderia')->update(['is_active' => false]);

        $this->putJson("/api/subscribers/{$sub->subscriber_id}", ['name' => 'Ana C.', 'barangay' => 'Ganaderia'])->assertOk();
        $this->newSubscriber(['barangay' => 'Ganaderia', 'contact_number' => '09175551111', 'email' => 'c@a.test'])->assertStatus(422); // not for new people
    }

    public function test_registering_takes_a_barangay_and_an_optional_street(): void
    {
        $this->postJson('/api/register', [
            'first_name' => 'New', 'last_name' => 'Person', 'barangay' => 'Caballero', 'street' => 'Blk 4 Lot 2',
            'contact_number' => '09175559999', 'password' => 'password1', 'password_confirmation' => 'password1', 'accept_terms' => true,
        ])->assertCreated();

        $sub = Subscriber::where('contact_number', '09175559999')->firstOrFail();
        $this->assertSame('Caballero', $sub->barangay);
        $this->assertSame('Blk 4 Lot 2, Caballero, Palayan City', $sub->address);
    }

    public function test_renaming_a_barangay_rebuilds_the_address_and_keeps_the_street(): void
    {
        $admin = $this->staff('admin');
        Sanctum::actingAs($admin);
        $this->newSubscriber(['barangay' => 'Malate', 'street' => '12 Rizal St'])->assertCreated();
        $this->passwordConfirmed($admin);

        $this->putJson('/api/barangays/'.Barangay::where('name', 'Malate')->value('id'), ['name' => 'Malate'])->assertOk();

        $sub = Subscriber::firstOrFail();
        $this->assertSame('Malate', $sub->barangay);
        $this->assertSame('12 Rizal St, Malate, Palayan City', $sub->address);
    }
}
