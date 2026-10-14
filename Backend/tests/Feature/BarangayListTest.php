<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** The barangays an address can be chosen from are managed by an admin, not written into the code. */
class BarangayListTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\DB::table("barangays")->whereNotIn("name", ["Malate", "Santolan", "Caballero", "Ganaderia", "Caimito"])->delete(); // the tests start from five
        config(['ratelimit.enabled' => false]);
        Http::fake(['*' => Http::response(['status' => 'success'])]);
    }

    private function user(string $role): User
    {
        $id = DB::table('users')->insertGetId([
            'name' => ucfirst($role), 'email' => $role.uniqid().'@p.test', 'password' => bcrypt('x'), 'role' => $role,
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function register(string $address)
    {
        return $this->postJson('/api/register', [
            'first_name' => 'New', 'last_name' => 'Person', 'address' => $address, 'contact_number' => '09175559999',
            'password' => 'password1', 'password_confirmation' => 'password1', 'accept_terms' => true,
        ]);
    }

    public function test_the_registration_form_can_read_the_list_without_signing_in(): void
    {
        $this->getJson('/api/barangays')->assertOk()
            ->assertJsonPath('data.0', 'Malate')
            ->assertJsonPath('city', 'Palayan City')
            ->assertJsonCount(5, 'data');
    }

    public function test_only_an_admin_can_change_the_list(): void
    {
        foreach (['secretary', 'collector'] as $role) {
            Sanctum::actingAs($this->user($role));
            $this->postJson('/api/barangays', ['name' => 'Aulo'])->assertForbidden();
            $this->getJson('/api/barangays/manage')->assertForbidden();
        }
    }

    public function test_a_new_barangay_can_be_added_and_registered_with(): void
    {
        $this->register('Aulo, Palayan City')->assertStatus(422);

        Sanctum::actingAs($this->user('admin'));
        // Typing the city too is fine: it is not doubled.
        $this->postJson('/api/barangays', ['name' => 'aulo, Palayan City'])->assertCreated();
        $this->assertTrue(Barangay::where('name', 'Aulo')->exists());
        $this->postJson('/api/barangays', ['name' => 'AULO'])->assertStatus(422); // already there
        $this->postJson('/api/barangays', ['name' => 'A'])->assertStatus(422);
        $this->postJson('/api/barangays', ['name' => 'Bagong, Buhay'])->assertStatus(422);

        $this->app['auth']->forgetGuards();
        $this->register('Aulo, Palayan City')->assertCreated();
    }

    public function test_a_switched_off_barangay_is_no_longer_offered(): void
    {
        Sanctum::actingAs($this->user('admin'));
        $caimito = Barangay::where('name', 'Caimito')->firstOrFail();

        $this->putJson("/api/barangays/{$caimito->id}", ['is_active' => false])->assertOk();

        $this->getJson('/api/barangays')->assertJsonCount(4, 'data');
        $this->getJson('/api/barangays/manage')->assertJsonCount(5, 'data');
        $this->app['auth']->forgetGuards();
        $this->register('Caimito, Palayan City')->assertStatus(422);
    }

    public function test_renaming_updates_the_addresses_already_saved(): void
    {
        $sub = Subscriber::create(['name' => 'Ana Cruz', 'address' => 'Malate, Palayan City', 'contact_number' => '09171112222', 'account_status' => 'active', 'status' => 'Active']);
        Sanctum::actingAs($this->user('admin'));
        $malete = Barangay::where('name', 'Malate')->firstOrFail();

        $this->putJson("/api/barangays/{$malete->id}", ['name' => 'Malate'])->assertOk();

        $this->assertSame('Malate, Palayan City', $sub->fresh()->address);
    }

    public function test_one_that_is_in_use_cannot_be_deleted_and_the_last_one_cannot_be_switched_off(): void
    {
        Subscriber::create(['name' => 'Ana Cruz', 'address' => 'Malate, Palayan City', 'contact_number' => '09171112222', 'account_status' => 'active', 'status' => 'Active']);
        Sanctum::actingAs($this->user('admin'));
        $malete = Barangay::where('name', 'Malate')->firstOrFail();
        $santolan = Barangay::where('name', 'Santolan')->firstOrFail();

        $this->deleteJson("/api/barangays/{$malete->id}")->assertStatus(422);
        $this->deleteJson("/api/barangays/{$santolan->id}")->assertOk();

        foreach (Barangay::where('name', '!=', 'Malate')->get() as $other) {
            $this->putJson("/api/barangays/{$other->id}", ['is_active' => false])->assertOk();
        }
        $this->putJson("/api/barangays/{$malete->id}", ['is_active' => false])->assertStatus(422);
    }
}
