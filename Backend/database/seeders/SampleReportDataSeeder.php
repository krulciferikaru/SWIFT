<?php

namespace Database\Seeders;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscriber;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SampleReportDataSeeder extends Seeder
{
    public function run(): void
    {
        $plans = collect([
            [
                'plan_name' => 'Basic Plan',
                'monthly_rate' => 500,
                'description' => 'Starter plan for small households.',
                'speed_mbps' => 20,
            ],
            [
                'plan_name' => 'Standard Plan',
                'monthly_rate' => 800,
                'description' => 'Balanced plan for everyday browsing and streaming.',
                'speed_mbps' => 50,
            ],
            [
                'plan_name' => 'Premium Plan',
                'monthly_rate' => 1200,
                'description' => 'Higher bandwidth for heavy usage and multiple devices.',
                'speed_mbps' => 100,
            ],
        ])->map(function (array $planData): Plan {
            return Plan::updateOrCreate(
                ['plan_name' => $planData['plan_name']],
                [
                    'monthly_rate' => $planData['monthly_rate'],
                    'description' => $planData['description'],
                    'speed_mbps' => $planData['speed_mbps'],
                    'status' => 'Active',
                ]
            );
        });

        $admin = User::firstOrCreate(
            ['email' => 'reports.admin@swift.test'],
            [
                'name' => 'Reports Admin',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'account_status' => 'active',
            ]
        );

        $secretary = User::firstOrCreate(
            ['email' => 'reports.secretary@swift.test'],
            [
                'name' => 'Reports Secretary',
                'password' => Hash::make('password'),
                'role' => 'secretary',
                'account_status' => 'active',
            ]
        );

        $subscriberRows = [
            [
                'email' => 'juan.delacruz@example.test',
                'name' => 'Juan Dela Cruz',
                'plan_id' => $plans[0]->plan_id,
                'address' => 'Poblacion, SWIFT City',
                'contact_number' => '09170000001',
                'mac_address' => '00:11:22:33:44:01',
                'connection_date' => '2026-05-03',
                'password' => Hash::make('password'),
                'status' => 'Active',
            ],
            [
                'email' => 'maria.santos@example.test',
                'name' => 'Maria Santos',
                'plan_id' => $plans[1]->plan_id,
                'address' => 'San Jose, SWIFT City',
                'contact_number' => '09170000002',
                'mac_address' => '00:11:22:33:44:02',
                'connection_date' => '2026-05-10',
                'password' => Hash::make('password'),
                'status' => 'Unpaid',
            ],
            [
                'email' => 'pedro.reyes@example.test',
                'name' => 'Pedro Reyes',
                'plan_id' => $plans[2]->plan_id,
                'address' => 'Bayanihan, SWIFT City',
                'contact_number' => '09170000003',
                'mac_address' => '00:11:22:33:44:03',
                'connection_date' => '2026-04-15',
                'password' => Hash::make('password'),
                'status' => 'Disconnected',
            ],
            [
                'email' => 'ana.lopez@example.test',
                'name' => 'Ana Lopez',
                'plan_id' => $plans[0]->plan_id,
                'address' => 'Riverside, SWIFT City',
                'contact_number' => '09170000004',
                'mac_address' => '00:11:22:33:44:04',
                'connection_date' => '2026-07-01',
                'password' => Hash::make('password'),
                'status' => 'Unpaid',
            ],
            [
                'email' => 'leo.garcia@example.test',
                'name' => 'Leo Garcia',
                'plan_id' => $plans[1]->plan_id,
                'address' => 'Market District, SWIFT City',
                'contact_number' => '09170000005',
                'mac_address' => '00:11:22:33:44:05',
                'connection_date' => '2026-06-05',
                'password' => Hash::make('password'),
                'status' => 'Active',
            ],
        ];

        $subscribers = collect($subscriberRows)->map(function (array $subscriberData) use ($admin, $secretary): Subscriber {
            $subscriber = Subscriber::updateOrCreate(
                ['email' => $subscriberData['email']],
                $subscriberData
            );

            return $subscriber;
        });

        $paymentRows = [
            [
                'subscriber_email' => 'juan.delacruz@example.test',
                'payment_date' => '2026-05-05',
                'amount' => 500,
                'or_number' => 'OR-2026-0001',
                'payment_method' => 'Cash',
                'notes' => 'May installment payment.',
                'recorded_by' => $admin->id,
            ],
            [
                'subscriber_email' => 'juan.delacruz@example.test',
                'payment_date' => '2026-06-05',
                'amount' => 500,
                'or_number' => 'OR-2026-0002',
                'payment_method' => 'GCash',
                'notes' => 'June installment payment.',
                'recorded_by' => $secretary->id,
            ],
            [
                'subscriber_email' => 'juan.delacruz@example.test',
                'payment_date' => '2026-07-05',
                'amount' => 500,
                'or_number' => 'OR-2026-0003',
                'payment_method' => 'Cash',
                'notes' => 'July installment payment.',
                'recorded_by' => $admin->id,
            ],
            [
                'subscriber_email' => 'maria.santos@example.test',
                'payment_date' => '2026-05-10',
                'amount' => 800,
                'or_number' => 'OR-2026-0004',
                'payment_method' => 'Cash',
                'notes' => 'May installment payment.',
                'recorded_by' => $secretary->id,
            ],
            [
                'subscriber_email' => 'maria.santos@example.test',
                'payment_date' => '2026-06-10',
                'amount' => 800,
                'or_number' => 'OR-2026-0005',
                'payment_method' => 'Others',
                'notes' => 'June installment payment.',
                'recorded_by' => $admin->id,
            ],
            [
                'subscriber_email' => 'pedro.reyes@example.test',
                'payment_date' => '2026-04-20',
                'amount' => 1200,
                'or_number' => 'OR-2026-0006',
                'payment_method' => 'Cash',
                'notes' => 'Initial payment on premium plan.',
                'recorded_by' => $admin->id,
            ],
            [
                'subscriber_email' => 'ana.lopez@example.test',
                'payment_date' => '2026-07-12',
                'amount' => 500,
                'or_number' => 'OR-2026-0007',
                'payment_method' => 'GCash',
                'notes' => 'First partial July payment.',
                'recorded_by' => $secretary->id,
            ],
            [
                'subscriber_email' => 'leo.garcia@example.test',
                'payment_date' => '2026-06-08',
                'amount' => 800,
                'or_number' => 'OR-2026-0008',
                'payment_method' => 'Cash',
                'notes' => 'June payment.',
                'recorded_by' => $admin->id,
            ],
            [
                'subscriber_email' => 'leo.garcia@example.test',
                'payment_date' => '2026-07-08',
                'amount' => 800,
                'or_number' => 'OR-2026-0009',
                'payment_method' => 'GCash',
                'notes' => 'July payment.',
                'recorded_by' => $secretary->id,
            ],
        ];

        foreach ($paymentRows as $paymentData) {
            $subscriber = $subscribers->firstWhere('email', $paymentData['subscriber_email']);

            if (! $subscriber) {
                continue;
            }

            Payment::updateOrCreate(
                ['or_number' => $paymentData['or_number']],
                [
                    'subscriber_id' => $subscriber->subscriber_id,
                    'amount' => $paymentData['amount'],
                    'payment_date' => Carbon::parse($paymentData['payment_date'])->toDateString(),
                    'payment_method' => $paymentData['payment_method'],
                    'notes' => $paymentData['notes'],
                    'recorded_by' => $paymentData['recorded_by'],
                ]
            );
        }
    }
}