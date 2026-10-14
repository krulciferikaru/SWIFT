<?php

namespace Tests\Feature;

use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TermsAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false, 'legal.version' => 'v-test']);
    }

    private function registration(array $extra = []): array
    {
        return array_merge([
            'first_name' => 'Ana', 'last_name' => 'Cruz', 'address' => 'Malate, Palayan City',
            'contact_number' => '09171112222', 'password' => 'password1', 'password_confirmation' => 'password1',
        ], $extra);
    }

    public function test_registering_requires_agreeing_to_the_terms_and_privacy_policy(): void
    {
        $this->postJson('/api/register', $this->registration())
            ->assertStatus(422)
            ->assertJsonValidationErrors('accept_terms')
            ->assertJsonPath('errors.accept_terms.0', 'You need to agree to the Terms of Service and Privacy Policy to register.');

        $this->postJson('/api/register', $this->registration(['accept_terms' => false]))->assertStatus(422);
        $this->assertSame(0, Subscriber::count());
    }

    public function test_the_agreement_and_its_version_are_recorded_and_carried_to_the_login(): void
    {
        $this->postJson('/api/register', $this->registration(['accept_terms' => true]))->assertCreated();

        $subscriber = Subscriber::firstOrFail();
        $this->assertNotNull($subscriber->terms_accepted_at);
        $this->assertSame('v-test', $subscriber->terms_version);

        $staff = User::create(['name' => 'S', 'email' => 's@terms.test', 'password' => 'abcd1234', 'role' => 'secretary', 'account_status' => 'active']);
        $plan = \App\Models\Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 500, 'speed_mbps' => 10, 'status' => 'Active']);
        $this->actingAs($staff)->patchJson("/api/subscribers/{$subscriber->subscriber_id}/approve", ['plan_id' => $plan->plan_id, 'connection_date' => '2026-05-01'])->assertOk();

        $login = User::where('subscriber_id', $subscriber->subscriber_id)->firstOrFail();
        $this->assertSame('v-test', $login->terms_version);
        $this->assertNotNull($login->terms_accepted_at);
    }

    public function test_claiming_an_existing_subscriber_records_the_agreement_too(): void
    {
        Subscriber::create(['name' => 'Ana Cruz', 'contact_number' => '09171112222', 'account_status' => 'active', 'status' => 'Active']);

        $this->postJson('/api/register', $this->registration(['accept_terms' => true]))->assertCreated()->assertJsonPath('claim', true);

        $this->assertSame('v-test', User::where('contact_number', '09171112222')->value('terms_version'));
    }
}
