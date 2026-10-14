<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use App\Services\BillingService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Realistic mock-up data for looking around the system (TablePlus, demos, screenshots).
 *
 *   php artisan db:seed --class=MockupDataSeeder
 *
 * About 70 subscribers installed between 2 and 20 months ago, every month paid on time, late, in
 * lumps, partly, in advance or not at all, so every status, balance and report has something in
 * it: Active, Unpaid (1 and 2 months behind), Disconnected, brand new, upgraded plan, a price
 * change, cancelled (voided) payments, archived subscribers and applicants waiting for approval.
 * Dates are worked out from today, so the data always looks current.
 *
 * Safe to run again: it first removes what an earlier run made (everything with an email ending in
 * @mockup.swift.test) and builds it afresh. It never touches other records, and refuses to run in
 * production. It records data straight into the database: no texts are sent.
 */
class MockupDataSeeder extends Seeder
{
    private const DOMAIN = '@mockup.swift.test';

    private Carbon $today;

    /** @var array<string, Plan> */
    private array $plans = [];

    /** Standard went up from 750 to 800 this many months ago. */
    private const PRICE_CHANGE_MONTHS_AGO = 5;

    /** @var list<array<string, mixed>> */
    private array $payments = [];

    /** @var list<int> */
    private array $recorders = [];

    private int $adminId;

    private const FIRST = ['Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Antonio', 'Elena', 'Ramon', 'Luz', 'Carlos', 'Teresita',
        'Miguel', 'Corazon', 'Ricardo', 'Imelda', 'Eduardo', 'Lourdes', 'Fernando', 'Josefina', 'Roberto', 'Gloria', 'Manuel', 'Cristina',
        'Rodrigo', 'Marites', 'Alfredo', 'Divina', 'Danilo', 'Evelyn', 'Rolando', 'Nenita', 'Ernesto', 'Maricel', 'Noel', 'Jocelyn',
        'Arnel', 'Rowena', 'Benjie', 'Aileen', 'Jerome', 'Kristine', 'Mark', 'Angelica', 'Joel', 'Shaira', 'Rey', 'Liza', 'Dennis', 'Mylene',
        'Glenn', 'Jenny', 'Allan', 'Cherry', 'Ronnie', 'Vilma', 'Edgar', 'Marilou', 'Jun', 'Beth', 'Leo', 'Nora', 'Bong', 'Tess', 'Rico',
        'Mina', 'Dante', 'Ligaya', 'Cesar', 'Amor', 'Nilo', 'Fe'];

    private const LAST = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Bautista', 'Ocampo', 'Mendoza', 'Villanueva', 'Aquino', 'Castillo',
        'Ramos', 'Torres', 'Navarro', 'Domingo', 'Manalo', 'Pascual', 'Soriano', 'Valdez', 'Corpuz', 'Macaraeg', 'Dizon', 'Tolentino',
        'Cabrera', 'Salvador', 'Lacson', 'Gonzales', 'Rivera', 'Flores', 'Agustin', 'De Guzman'];

    /**
     * The barangays an address is chosen from. The five the system starts with come first; the others
     * are added to the list on this machine so the Barangays card in Settings has something to scroll
     * (the company's real list is its own to enter). An address is saved as "<name>, Palayan City".
     */
    private const BARANGAYS = ['Malate', 'Santolan', 'Caballero', 'Ganaderia', 'Caimito', 'Atate', 'Aulo', 'Bagong Buhay', 'Bagong Sikat',
        'Doña Josefa', 'Imelda Valley', 'Langka', 'Maligaya', 'Manacnac', 'Marcos Village', 'Militar', 'Singalat', 'Sapang Buho', 'Santo Niño'];

    private const METHODS = ['Cash', 'Cash', 'Cash', 'Cash', 'GCash', 'GCash', 'Others'];

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->error('The mock-up data is for development only. It will not run in production.');

            return;
        }

        mt_srand(2026);
        $this->today = Carbon::now('Asia/Manila')->startOfDay();

        $this->clearEarlierRun();
        $this->makeBarangays();
        $this->makePlans();
        $this->makeStaff();

        $n = 0;
        $groups = [
            // [how many, what they are like]
            [16, ['behind' => 0]],                                   // paid up every month
            [3,  ['behind' => 0, 'ahead' => 1]],                     // paid up and a month ahead
            [2,  ['behind' => 0, 'ahead' => 2]],                     // two months ahead
            [8,  ['behind' => 1]],                                   // 1 month behind: Unpaid
            [5,  ['behind' => 2]],                                   // 2 months behind: Unpaid
            [6,  ['behind' => 3, 'stoppedMin' => 3]],                // 3+ months behind: Disconnected
            [3,  ['behind' => 1, 'partial' => true]],                // last month only half paid
            [4,  ['behind' => 0, 'lump' => true]],                   // pays two months at a time
            [3,  ['behind' => 0, 'upgrade' => true]],                // moved to a bigger plan 4 months ago
            [3,  ['behind' => 0, 'void' => true]],                   // a payment entered twice, one cancelled
            [2,  ['behind' => 1, 'void' => true]],
            [4,  ['new' => true]],                                   // installed this month
            [2,  ['new' => 'last', 'behind' => 1]],                       // installed last month, first bill unpaid
        ];

        foreach ($groups as [$count, $spec]) {
            for ($i = 0; $i < $count; $i++) {
                $this->subscriber($n++, $spec);
            }
        }

        $this->demoSubscriber($n++);
        $this->archived($n++);
        $this->archived($n++);
        $this->archived($n++);
        // Registrations waiting for approval, and ones that were turned down.
        $this->applicant($n++, 'pending');
        $this->applicant($n++, 'pending');
        $this->applicant($n++, 'pending');
        $this->applicant($n++, 'rejected');
        $this->applicant($n++, 'rejected');
        $this->applicant($n++, 'rejected');

        $this->savePayments();
        $this->makeSubscriberLogins();
        $this->makeClaims();
        $this->workOutStatuses();
        $this->summary();
    }

    // ---------------------------------------------------------------- set-up

    private function clearEarlierRun(): void
    {
        $ids = Subscriber::withTrashed()->where('email', 'like', '%'.self::DOMAIN)->pluck('subscriber_id');
        if ($ids->isNotEmpty()) {
            DB::table('payments')->whereIn('subscriber_id', $ids)->delete();
            DB::table('subscriber_plan_history')->whereIn('subscriber_id', $ids)->delete();
            DB::table('subscriber_status_history')->whereIn('subscriber_id', $ids)->delete();
            DB::table('users')->whereIn('subscriber_id', $ids)->delete();
            Subscriber::withTrashed()->whereIn('subscriber_id', $ids)->forceDelete();
        }
        User::where('email', 'like', 'mockup.%'.self::DOMAIN)->delete();
        User::where('email', 'subscriber@swift.test')->delete();
    }

    /** Makes sure every barangay used for an address is on the list (keeps the original five in order). */
    private function makeBarangays(): void
    {
        foreach (self::BARANGAYS as $i => $name) {
            Barangay::firstOrCreate(['name' => $name], ['is_active' => true, 'sort_order' => $i + 1]);
        }
    }

    private function makePlans(): void
    {
        $defs = [
            'basic' => ['Basic 20 Mbps', 500, 20, 'Starter plan for small households.'],
            'standard' => ['Standard 50 Mbps', 800, 50, 'Balanced plan for everyday browsing and streaming.'],
            'premium' => ['Premium 100 Mbps', 1200, 100, 'Higher bandwidth for heavy usage and several devices.'],
        ];
        foreach ($defs as $key => [$name, $rate, $speed, $description]) {
            $plan = Plan::withTrashed()->updateOrCreate(
                ['plan_name' => $name],
                ['monthly_rate' => $rate, 'speed_mbps' => $speed, 'description' => $description, 'status' => 'Active', 'deleted_at' => null],
            );
            DB::table('plan_rate_history')->where('plan_id', $plan->plan_id)->delete();
            DB::table('plan_rate_history')->insert(['plan_id' => $plan->plan_id, 'monthly_rate' => $rate, 'effective_from' => '2000-01-01', 'created_at' => now()]);
            $this->plans[$key] = $plan;
        }

        // Standard used to cost 750 and went up to 800 a few months ago: earlier months stay at 750.
        $from = $this->today->copy()->startOfMonth()->subMonths(self::PRICE_CHANGE_MONTHS_AGO);
        DB::table('plan_rate_history')->where('plan_id', $this->plans['standard']->plan_id)->update(['monthly_rate' => 750]);
        DB::table('plan_rate_history')->insert([
            'plan_id' => $this->plans['standard']->plan_id, 'monthly_rate' => 800, 'effective_from' => $from->toDateString(), 'created_at' => now(),
        ]);

        // A plan that is no longer offered (shows in the Archive).
        $old = Plan::withTrashed()->updateOrCreate(
            ['plan_name' => 'Promo 15 Mbps (ended)'],
            ['monthly_rate' => 350, 'speed_mbps' => 15, 'description' => 'Opening promo, no longer offered.', 'status' => 'Inactive'],
        );
        if (! $old->trashed()) {
            $old->delete();
        }
    }

    private function makeStaff(): void
    {
        $password = config('seeding.demo_password') ?: 'abcd1234';

        $admin = User::updateOrCreate(['email' => 'admin@swift.test'], [
            'name' => 'SWIFT Admin', 'password' => Hash::make($password), 'role' => 'admin', 'account_status' => 'active',
        ]);
        $this->adminId = $admin->id;

        // Two secretaries and two collectors. The first of each has a verified mobile number and two-step
        // sign-in turned on (fixed secrets and recovery codes, below, so a test phone can be set up); the
        // second has neither, to try turning it on from Settings.
        $secretary = User::updateOrCreate(['email' => 'secretary@swift.test'], [
            'name' => 'Maricel Dizon', 'password' => Hash::make($password), 'role' => 'secretary', 'account_status' => 'active',
            'contact_number' => '09175550101',
        ]);
        $this->protect($secretary, self::DEMO_TWO_STEP['secretary@swift.test']);
        User::updateOrCreate(['email' => 'secretary2@swift.test'], [
            'name' => 'Elena Reyes', 'password' => Hash::make($password), 'role' => 'secretary', 'account_status' => 'active',
            'contact_number' => '09175550104', 'contact_verified_at' => null,
            'mfa_secret' => null, 'mfa_enabled_at' => null, 'mfa_recovery_codes' => null, 'mfa_last_step' => null,
        ]);

        $collectors = [];
        foreach ([1 => ['Rodel Macaraeg', '09175550102'], 2 => ['Nilo Agustin', '09175550103']] as $i => [$name, $number]) {
            $collectors[] = User::updateOrCreate(['email' => "collector{$i}@swift.test"], [
                'name' => $name, 'password' => Hash::make($password), 'role' => 'collector', 'account_status' => 'active',
                'contact_number' => $number,
            ]);
        }
        $this->protect($collectors[0], self::DEMO_TWO_STEP['collector1@swift.test']);
        $collectors[1]->forceFill(['contact_verified_at' => null, 'mfa_secret' => null, 'mfa_enabled_at' => null, 'mfa_recovery_codes' => null, 'mfa_last_step' => null])->save();

        // The secretary encodes most payments; the two collectors some; the admin a few.
        $this->recorders = [$secretary->id, $secretary->id, $secretary->id, $collectors[0]->id, $collectors[1]->id, $admin->id];
    }

    /**
     * Fixed demo two-step details, so the same test phone works after every re-seed: the secret to type
     * into an authenticator app ("enter a key") and eight single-use recovery codes. Local demo data only.
     */
    private const DEMO_TWO_STEP = [
        'secretary@swift.test' => [
            'secret' => 'KRSXG5CTMVRXEZLUKRSXG5CTMVRXEZLU',
            'codes' => ['1A2B-3C4D', '5E6F-7A8B', '9C0D-1E2F', '3A4B-5C6D', '7E8F-9A0B', '1C2D-3E4F', '5A6B-7C8D', '9E0F-1A2B'],
        ],
        'collector1@swift.test' => [
            'secret' => 'MFRGGZDFMZTWQ2LKMFRGGZDFMZTWQ2LK',
            'codes' => ['2B3C-4D5E', '6F7A-8B9C', '0D1E-2F3A', '4B5C-6D7E', '8F9A-0B1C', '2D3E-4F5A', '6B7C-8D9E', '0F1A-2B3C'],
        ],
    ];

    /** A verified mobile number and two-step sign-in turned on, with the fixed secret and recovery codes. */
    private function protect(User $user, array $details): void
    {
        $user->forceFill([
            'contact_verified_at' => now()->subDays(30),
            'mfa_secret' => $details['secret'],
            'mfa_enabled_at' => now()->subDays(20),
            'mfa_last_step' => null,
            'mfa_recovery_codes' => array_map(fn ($code) => Hash::make(strtoupper(preg_replace('/[^0-9A-Za-z]/', '', $code))), $details['codes']),
        ])->save();
    }

    // ---------------------------------------------------------------- people

    private function person(int $n): array
    {
        $first = self::FIRST[$n % count(self::FIRST)];
        $last = self::LAST[intdiv($n * 7, 1) % count(self::LAST)];
        $slug = strtolower(preg_replace('/[^a-z]/i', '', $first.$last)).($n + 1);

        return [
            'name' => "$first $last",
            'address' => Barangay::address(self::BARANGAYS[$n % count(self::BARANGAYS)]),
            'contact_number' => sprintf('0917%07d', 2000000 + $n * 37),
            'email' => $slug.self::DOMAIN,
            'mac_address' => sprintf('AC:84:C6:%02X:%02X:%02X', 16 + $n, ($n * 29) % 256, ($n * 53) % 256),
        ];
    }

    /** @var list<Subscriber> everyone who is an active subscriber, in the order they were made */
    private array $people = [];

    /** The subscriber to sign in as when trying the subscriber side: subscriber@swift.test. */
    private function demoSubscriber(int $n): void
    {
        $this->subscriber($n, ['behind' => 1, 'demo' => true]);
    }

    /**
     * Half of the subscribers can sign in. Of those, half have a verified mobile number and half do
     * not (they see the "verify your number" step). The demo subscriber is always one of them, verified.
     */
    private function makeSubscriberLogins(): void
    {
        $password = config('seeding.demo_password') ?: 'abcd1234';
        foreach ($this->people as $i => $s) {
            $demo = $s->email === 'demo.subscriber'.self::DOMAIN;
            if (! $demo && $i % 2 !== 0) {
                continue;
            }
            $verified = $demo || $i % 4 === 0;
            $user = User::create([
                'subscriber_id' => $s->subscriber_id,
                'name' => $s->name,
                'email' => $demo ? 'subscriber@swift.test' : $s->email,
                'contact_number' => $s->contact_number,
                'password' => Hash::make($password),
                'role' => 'subscriber',
                'account_status' => 'active',
            ]);
            // Not mass-assignable on purpose (only a real text message verifies a number).
            $user->forceFill(['contact_verified_at' => $verified ? now()->subDays(mt_rand(5, 300)) : null])->save();
        }
    }

    private function subscriber(int $n, array $spec): void
    {
        $planKey = ['basic', 'standard', 'standard', 'premium', 'basic', 'standard'][$n % 6];
        $new = $spec['new'] ?? null;
        if (! empty($spec['demo'])) {
            $planKey = 'standard';
        }

        $installedMonthsAgo = match (true) {
            $new === true => 0,
            $new === 'last' => 1,
            isset($spec['upgrade']) => 8 + ($n % 6),
            default => 7 + ($n * 5) % 14, // 7 to 20 months ago: at least six months of payments
        };
        if (isset($spec['stoppedMin'])) {
            $installedMonthsAgo = max($installedMonthsAgo, 9);
        }

        $installed = $this->today->copy()->subMonths($installedMonthsAgo)->day(min(28, 1 + ($n * 7) % 27));
        if ($installed->gt($this->today)) {
            $installed = $this->today->copy();
        }

        $subscriber = Subscriber::create([
            ...$this->person($n),
            ...(! empty($spec['demo']) ? ['name' => 'Demo Subscriber', 'email' => 'demo.subscriber'.self::DOMAIN] : []),
            'plan_id' => $this->plans[$planKey]->plan_id,
            'connection_date' => $installed->toDateString(),
            'status' => 'Active',
            'account_status' => 'active',
        ]);

        $this->people[] = $subscriber;

        $changeMonth = null;
        if (! empty($spec['upgrade'])) {
            $changeMonth = $this->today->copy()->startOfMonth()->subMonths(4);
        }
        $to = $changeMonth ? $this->plans['premium'] : null;

        // One bill for each month after the installation month, up to and including this one.
        $months = [];
        for ($m = $installed->copy()->startOfMonth()->addMonth(); $m->lte($this->today); $m->addMonth()) {
            $months[] = $m->copy();
        }
        $unpaid = (int) ($spec['behind'] ?? 0);
        $paid = array_slice($months, 0, max(0, count($months) - $unpaid));

        $rateFor = fn (Carbon $month): float => $this->rate($changeMonth && $month->gte($changeMonth) ? $to : $this->plans[$planKey], $month);

        $queue = [];
        foreach ($paid as $i => $month) {
            $queue[] = [$month, $rateFor($month)];
        }
        if (! empty($spec['lump'])) {
            // Pairs of months paid together, on the later month's date.
            $joined = [];
            for ($i = 0; $i < count($queue); $i += 2) {
                $pair = array_slice($queue, $i, 2);
                $joined[] = [end($pair)[0], array_sum(array_column($pair, 1))];
            }
            $queue = $joined;
        }

        foreach ($queue as [$month, $amount]) {
            $date = $month->copy()->addDays(2 + mt_rand(0, 20));
            $this->pay($subscriber, $date, $amount);
        }

        // Half of the oldest unpaid month.
        if (! empty($spec['partial']) && isset($months[count($paid)])) {
            $month = $months[count($paid)];
            $this->pay($subscriber, $month->copy()->addDays(10), round($rateFor($month) / 2, 2));
        }

        // Paid some months ahead.
        if (! empty($spec['ahead'])) {
            $this->pay($subscriber, $this->today->copy()->subDays(mt_rand(0, 4)), $spec['ahead'] * $this->rate($this->plans[$planKey], $this->today));
        }

        // A payment typed in twice; one of them was cancelled.
        if (! empty($spec['void']) && $paid) {
            $when = end($paid)->copy()->addDays(6);
            $amount = $rateFor(end($paid));
            $this->pay($subscriber, $when, $amount, [
                'voided_at' => $when->copy()->setTime(15, 20), 'voided_by' => $this->adminId, 'void_reason' => 'Entered twice by mistake',
            ]);
        }

        if ($changeMonth) {
            DB::table('subscriber')->where('subscriber_id', $subscriber->subscriber_id)->update(['plan_id' => $to->plan_id]);
            DB::table('subscriber_plan_history')->insert([
                'subscriber_id' => $subscriber->subscriber_id, 'plan_id' => $to->plan_id,
                'effective_from' => $changeMonth->toDateString(), 'changed_by' => $this->adminId, 'created_at' => now(),
            ]);
        }
    }

    /** Someone moved to the Archive: a normal history, then archived. */
    private function archived(int $n): void
    {
        $installed = $this->today->copy()->subMonths(12 + $n % 4)->day(10);
        $subscriber = Subscriber::create([
            ...$this->person($n),
            'plan_id' => $this->plans['basic']->plan_id,
            'connection_date' => $installed->toDateString(),
            'status' => 'Active',
            'account_status' => 'active',
        ]);
        // Paid for a while, then moved away.
        for ($m = $installed->copy()->startOfMonth()->addMonth(), $i = 0; $i < 7; $m->addMonth(), $i++) {
            $this->pay($subscriber, $m->copy()->addDays(4 + $i % 9), 500);
        }
        $this->archive[] = $subscriber->subscriber_id;
    }

    /** @var list<int> archived after their payments are saved */
    private array $archive = [];

    /**
     * Someone who registered on the website. They are a subscriber record with no installation yet,
     * and no login until staff approve them. "rejected" ones show in the Rejected tab of Approvals.
     */
    private function applicant(int $n, string $state): void
    {
        Subscriber::create([
            ...$this->person($n),
            'plan_id' => null,
            'connection_date' => null,
            'status' => 'Active',
            'account_status' => $state,
            'password' => Hash::make('abcd1234'),
            'terms_accepted_at' => now()->subDays(mt_rand(1, 20)),
            'terms_version' => '1',
        ]);
    }

    /**
     * Existing subscribers who registered an account for their record ("account claims"): two are
     * waiting for staff to check them, two were turned down. They are people without a login yet.
     */
    private function makeClaims(): void
    {
        $withoutLogin = array_values(array_filter($this->people, fn (Subscriber $s) => ! User::where('subscriber_id', $s->subscriber_id)->exists()
            && $s->email !== 'demo.subscriber'.self::DOMAIN));

        foreach (array_slice($withoutLogin, 0, 4) as $i => $s) {
            User::create([
                'subscriber_id' => $s->subscriber_id,
                'name' => $s->name,
                'email' => $s->email,
                'contact_number' => $s->contact_number,
                'password' => Hash::make('abcd1234'),
                'role' => 'subscriber',
                'account_status' => $i < 2 ? 'pending' : 'inactive',
            ]);
        }
    }

    // ---------------------------------------------------------------- payments

    /** What a plan cost in a given month (Standard went from 750 to 800). */
    private function rate(Plan $plan, Carbon $month): float
    {
        if ($plan->plan_id === $this->plans['standard']->plan_id) {
            $from = $this->today->copy()->startOfMonth()->subMonths(self::PRICE_CHANGE_MONTHS_AGO);

            return $month->copy()->startOfMonth()->lt($from) ? 750.0 : 800.0;
        }

        return (float) $plan->monthly_rate;
    }

    private function pay(Subscriber $subscriber, Carbon $date, float $amount, array $extra = []): void
    {
        if ($date->gt($this->today)) {
            $date = $this->today->copy();
        }
        $this->payments[] = [
            'subscriber_id' => $subscriber->subscriber_id,
            'amount' => $amount,
            'payment_date' => $date->toDateString(),
            'payment_method' => self::METHODS[mt_rand(0, count(self::METHODS) - 1)],
            'recorded_by' => $this->recorders[mt_rand(0, count($this->recorders) - 1)],
            ...$extra,
        ];
    }

    /** Receipt numbers run in order of date, like a receipt book. */
    private function savePayments(): void
    {
        usort($this->payments, fn ($a, $b) => [$a['payment_date'], $a['subscriber_id']] <=> [$b['payment_date'], $b['subscriber_id']]);

        foreach ($this->payments as $i => $row) {
            $payment = new Payment();
            $payment->forceFill([
                ...$row,
                'or_number' => sprintf('OR-%06d', 100001 + $i),
                'notes' => null,
                'created_at' => $row['payment_date'].' 10:00:00',
                'updated_at' => $row['payment_date'].' 10:00:00',
            ])->save();
        }

        foreach ($this->archive as $id) {
            Subscriber::find($id)?->delete();
        }
    }

    /** The system's own rule: 1 or 2 months behind is Unpaid, 3 or more is Disconnected. */
    private function workOutStatuses(): void
    {
        $billing = app(BillingService::class);
        Subscriber::where('account_status', 'active')->whereNotNull('connection_date')->get()
            ->each(fn (Subscriber $s) => $billing->recalculateStatus($s));
    }

    private function summary(): void
    {
        $rows = Subscriber::withTrashed()->where('email', 'like', '%'.self::DOMAIN)->get();
        $this->command?->info('Mock-up data created.');
        $this->command?->table(['What', 'How many'], [
            ['Active', $rows->where('account_status', 'active')->where('status', 'Active')->whereNull('deleted_at')->count()],
            ['Unpaid', $rows->where('account_status', 'active')->where('status', 'Unpaid')->whereNull('deleted_at')->count()],
            ['Disconnected', $rows->where('account_status', 'active')->where('status', 'Disconnected')->whereNull('deleted_at')->count()],
            ['Waiting for approval', $rows->where('account_status', 'pending')->count()],
            ['Rejected applications', $rows->where('account_status', 'rejected')->count()],
            ['Account claims (waiting / rejected)', User::where('account_status', 'pending')->whereNotNull('subscriber_id')->count().' / '.User::where('account_status', 'inactive')->whereNotNull('subscriber_id')->count()],
            ['Archived', $rows->whereNotNull('deleted_at')->count()],
            ['Payments', Payment::withVoided()->whereIn('subscriber_id', $rows->pluck('subscriber_id'))->count()],
            ['Cancelled payments', Payment::withVoided()->whereNotNull('voided_at')->count()],
        ]);
    }
}
