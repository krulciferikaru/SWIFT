<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportFiltersTest extends TestCase
{
    use RefreshDatabase;

    private Subscriber $juan;
    private Subscriber $maria;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ratelimit.enabled' => false]);

        $id = DB::table('users')->insertGetId([
            'name' => 'Admin', 'email' => 'admin@r.test', 'password' => 'x', 'role' => 'admin',
            'account_status' => 'active', 'created_at' => now(), 'updated_at' => now(),
        ]);
        Sanctum::actingAs(User::findOrFail($id));

        $basic = Plan::create(['plan_name' => 'Basic', 'monthly_rate' => 500, 'status' => 'Active']);
        $plus = Plan::create(['plan_name' => 'Plus', 'monthly_rate' => 900, 'status' => 'Active']);
        $this->juan = Subscriber::create(['plan_id' => $basic->plan_id, 'name' => 'Juan Cruz', 'contact_number' => '09170000001',
            'connection_date' => '2026-01-10', 'account_status' => 'active', 'status' => 'Active']);
        $this->maria = Subscriber::create(['plan_id' => $plus->plan_id, 'name' => 'Maria Santos', 'contact_number' => '09170000002',
            'connection_date' => '2026-01-10', 'account_status' => 'active', 'status' => 'Unpaid']);

        $this->pay($this->juan, '2026-03-05', 500, 'Cash', 'OR-100');
        $this->pay($this->juan, '2026-03-20', 500, 'GCash', 'OR-101');
        $this->pay($this->maria, '2026-03-12', 900, 'Cash', 'OR-200');
        $this->pay($this->maria, '2026-04-02', 900, 'GCash', 'OR-201');
    }

    private function pay(Subscriber $sub, string $date, float $amount, string $method, string $or): void
    {
        Payment::create(['subscriber_id' => $sub->subscriber_id, 'amount' => $amount, 'payment_date' => $date,
            'or_number' => $or, 'payment_method' => $method]);
    }

    private function collections(array $query)
    {
        return $this->getJson('/api/reports/collections?'.http_build_query($query));
    }

    public function test_a_custom_date_range_only_counts_payments_inside_it(): void
    {
        $this->collections(['range' => 'custom', 'from' => '2026-03-10', 'to' => '2026-03-31'])
            ->assertOk()
            ->assertJsonPath('data.summary.payment_count', 2)
            ->assertJsonPath('data.summary.total_collected', 1400)
            ->assertJsonPath('data.period.start', '2026-03-10');
    }

    public function test_a_custom_range_needs_both_dates_in_order_and_at_most_five_years(): void
    {
        $this->collections(['range' => 'custom'])->assertStatus(422);
        $this->collections(['range' => 'custom', 'from' => '2026-04-10', 'to' => '2026-03-01'])->assertStatus(422);
        $this->collections(['range' => 'custom', 'from' => '2015-01-01', 'to' => '2026-03-01'])->assertStatus(422);
    }

    public function test_it_filters_by_subscriber(): void
    {
        $this->collections(['range' => 'annual', 'year' => '2026', 'subscriber_id' => $this->juan->subscriber_id])
            ->assertJsonPath('data.summary.payment_count', 2)
            ->assertJsonPath('data.summary.total_collected', 1000)
            ->assertJsonPath('data.filter_labels.0', 'Subscriber: Juan Cruz');
    }

    public function test_it_filters_by_payment_method(): void
    {
        $this->collections(['range' => 'annual', 'year' => '2026', 'payment_method' => 'GCash'])
            ->assertJsonPath('data.summary.payment_count', 2)
            ->assertJsonPath('data.summary.total_collected', 1400)
            ->assertJsonCount(1, 'data.by_method');
    }

    public function test_it_filters_by_plan_and_by_part_of_an_or_number(): void
    {
        $this->collections(['range' => 'annual', 'year' => '2026', 'plan_id' => $this->maria->plan_id])
            ->assertJsonPath('data.summary.total_collected', 1800)
            ->assertJsonCount(1, 'data.by_plan');

        $this->collections(['range' => 'annual', 'year' => '2026', 'or_number' => '201'])
            ->assertJsonPath('data.summary.payment_count', 1);
    }

    public function test_filters_combine(): void
    {
        $this->collections(['range' => 'annual', 'year' => '2026', 'subscriber_id' => $this->maria->subscriber_id, 'payment_method' => 'Cash'])
            ->assertJsonPath('data.summary.payment_count', 1)
            ->assertJsonPath('data.summary.total_collected', 900);
    }

    public function test_the_financial_statement_filters_by_status_and_plan(): void
    {
        $this->getJson('/api/reports/financial-statement?range=monthly&month=2026-04&status=Unpaid')
            ->assertOk()
            ->assertJsonPath('data.summary.subscriber_count', 1)
            ->assertJsonPath('data.subscribers.0.name', 'Maria Santos')
            ->assertJsonPath('data.filter_labels.0', 'Status: Unpaid');

        $this->getJson('/api/reports/financial-statement?range=monthly&month=2026-04&plan_id='.$this->juan->plan_id)
            ->assertJsonPath('data.summary.subscriber_count', 1);
    }

    public function test_bad_filter_values_are_rejected(): void
    {
        $this->collections(['subscriber_id' => 99999])->assertStatus(422);
        $this->getJson('/api/reports/financial-statement?status=Nope')->assertStatus(422);
    }

    public function test_the_excel_file_states_the_filters(): void
    {
        $this->get('/api/reports/collections/xlsx?range=annual&year=2026&payment_method=GCash')->assertOk();
    }
}
