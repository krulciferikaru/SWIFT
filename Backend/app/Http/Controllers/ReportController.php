<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Subscriber;
use App\Services\BillingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Services\ReportExportService;

class ReportController extends Controller
{
    public function __construct(
        private BillingService $billing,
        private ReportExportService $exports
    ) {}

    public function subscribers(Request $request)
    {
        $query = Subscriber::with('plan')
            ->select([
                'subscriber_id',
                'plan_id',
                'name',
                'address',
                'contact_number',
                'email',
                'mac_address',
                'connection_date',
                'status',
                'created_at',
            ]);

        if ($request->filled('search')) {
            $query->search($request->search);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('plan_id')) {
            $query->where('plan_id', $request->plan_id);
        }

        $subscribers = $query->orderBy('name')->get();

        $filename = 'subscribers_report_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($subscribers): void {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'Subscriber ID',
                'Name',
                'Plan',
                'Address',
                'Contact Number',
                'Email',
                'MAC Address',
                'Connection Date',
                'Status',
                'Created At',
            ]);

            foreach ($subscribers as $subscriber) {
                fputcsv($handle, [
                    $subscriber->subscriber_id,
                    $subscriber->name,
                    $subscriber->plan?->plan_name ?? '—',
                    $subscriber->address ?? '—',
                    $subscriber->contact_number ?? '—',
                    $subscriber->email ?? '—',
                    $subscriber->mac_address ?? '—',
                    $subscriber->connection_date?->format('Y-m-d') ?? '—',
                    $subscriber->status,
                    $subscriber->created_at?->format('Y-m-d H:i:s') ?? '—',
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function collections(Request $request): JsonResponse
    {
        $period = $this->resolveMonthlyPeriod($request);
        $data = $this->buildCollectionsData($period);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function financialStatement(Request $request): JsonResponse
    {
        $period = $this->resolveMonthlyPeriod($request);
        $data = $this->buildFinancialStatementData($period);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function collectionsPdf(Request $request)
    {
        $period = $this->resolveMonthlyPeriod($request);
        $data = $this->buildCollectionsData($period);

        return $this->exports->downloadPdf(
            $this->downloadFilename('collections_report', $period, 'pdf'),
            $this->buildCollectionsPdfLines($data)
        );
    }

    public function collectionsXlsx(Request $request)
    {
        $period = $this->resolveMonthlyPeriod($request);
        $data = $this->buildCollectionsData($period);

        return $this->exports->downloadXlsx(
            $this->downloadFilename('collections_report', $period, 'xlsx'),
            'Collections',
            $this->buildCollectionsXlsxRows($data)
        );
    }

    public function financialStatementPdf(Request $request)
    {
        $period = $this->resolveMonthlyPeriod($request);
        $data = $this->buildFinancialStatementData($period);

        return $this->exports->downloadPdf(
            $this->downloadFilename('financial_statement', $period, 'pdf'),
            $this->buildFinancialStatementPdfLines($data)
        );
    }

    public function financialStatementXlsx(Request $request)
    {
        $period = $this->resolveMonthlyPeriod($request);
        $data = $this->buildFinancialStatementData($period);

        return $this->exports->downloadXlsx(
            $this->downloadFilename('financial_statement', $period, 'xlsx'),
            'Financial Statement',
            $this->buildFinancialStatementXlsxRows($data)
        );
    }

    private function resolveMonthlyPeriod(Request $request): array
    {
        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        $month = $validated['month'] ?? now()->format('Y-m');
        $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        return [
            'month' => $month,
            'label' => $start->format('F Y'),
            'start' => $start,
            'end' => $end,
        ];
    }

    private function buildCollectionsData(array $period): array
    {
        $baseQuery = Payment::query()->whereBetween('payment_date', [
            $period['start']->toDateString(),
            $period['end']->toDateString(),
        ]);

        $payments = (clone $baseQuery)
            ->with(['subscriber.plan'])
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->get()
            ->map(function ($payment) {
                /** @var Payment $payment */

                return [
                'id' => $payment->id,
                'payment_date' => $payment->payment_date ? Carbon::parse($payment->payment_date)->format('Y-m-d') : null,
                'subscriber_id' => $payment->subscriber_id,
                'subscriber_name' => $payment->subscriber?->name,
                'plan_name' => $payment->subscriber?->plan?->plan_name ?? 'Unassigned',
                'amount' => (float) $payment->amount,
                'payment_method' => $payment->payment_method,
                'or_number' => $payment->or_number,
                'notes' => $payment->notes,
                ];
            })
            ->values();

        $planBreakdown = Payment::query()
            ->join('subscriber', 'payments.subscriber_id', '=', 'subscriber.subscriber_id')
            ->leftJoin('plan', 'subscriber.plan_id', '=', 'plan.plan_id')
            ->whereBetween('payments.payment_date', [
                $period['start']->toDateString(),
                $period['end']->toDateString(),
            ])
            ->selectRaw('COALESCE(plan.plan_id, 0) as plan_id, COALESCE(plan.plan_name, "Unassigned") as plan_name, COUNT(*) as payment_count, COUNT(DISTINCT payments.subscriber_id) as subscriber_count, SUM(payments.amount) as total_collected')
            ->groupBy('plan.plan_id', 'plan.plan_name')
            ->orderByDesc('total_collected')
            ->get()
            ->map(fn ($row) => [
                'plan_id' => (int) $row->plan_id,
                'plan_name' => $row->plan_name,
                'payment_count' => (int) $row->payment_count,
                'subscriber_count' => (int) $row->subscriber_count,
                'total_collected' => (float) $row->total_collected,
            ])
            ->values();

        $methodBreakdown = (clone $baseQuery)
            ->selectRaw('payment_method, COUNT(*) as payment_count, COUNT(DISTINCT subscriber_id) as subscriber_count, SUM(amount) as total_collected')
            ->groupBy('payment_method')
            ->orderByDesc('total_collected')
            ->get()
            ->map(fn ($row) => [
                'payment_method' => $row->payment_method,
                'payment_count' => (int) $row->payment_count,
                'subscriber_count' => (int) $row->subscriber_count,
                'total_collected' => (float) $row->total_collected,
            ])
            ->values();

        return [
            'report_type' => 'collections',
            'report_title' => 'Monthly Collection Report',
            'month' => $period['month'],
            'period_label' => $period['label'],
            'period' => [
                'start' => $period['start']->toDateString(),
                'end' => $period['end']->toDateString(),
            ],
            'summary' => [
                'payment_count' => (clone $baseQuery)->count(),
                'paying_subscribers' => (clone $baseQuery)->distinct()->count('subscriber_id'),
                'total_collected' => (float) (clone $baseQuery)->sum('amount'),
            ],
            'by_plan' => $planBreakdown,
            'by_method' => $methodBreakdown,
            'payments' => $payments,
        ];
    }

    private function buildFinancialStatementData(array $period): array
    {
        $subscribers = Subscriber::with('plan')->orderBy('name')->get();

        $rows = [];
        $planSummary = [];
        $summary = [
            'subscriber_count' => 0,
            'total_owed' => 0.0,
            'total_paid' => 0.0,
            'total_outstanding' => 0.0,
            'total_advance_credit' => 0.0,
            'total_months_behind' => 0,
            'active_subscribers' => 0,
            'unpaid_subscribers' => 0,
            'disconnected_subscribers' => 0,
        ];

        foreach ($subscribers as $subscriber) {
            /** @var Subscriber $subscriber */

            $breakdown = $this->billing->getBreakdown($subscriber, $period['end']);
            $planId = $subscriber->plan?->plan_id ?? 0;
            $planName = $subscriber->plan?->plan_name ?? 'Unassigned';

            $rows[] = [
                'subscriber_id' => $subscriber->subscriber_id,
                'name' => $subscriber->name,
                'plan_name' => $planName,
                'status' => $subscriber->status,
                'monthly_rate' => (float) $breakdown['monthly_rate'],
                'total_owed' => (float) $breakdown['total_owed'],
                'total_paid' => (float) $breakdown['total_paid'],
                'balance' => (float) $breakdown['balance'],
                'advance_credit' => (float) $breakdown['advance_credit'],
                'months_behind' => (int) $breakdown['months_behind'],
            ];

            $summary['subscriber_count']++;
            $summary['total_owed'] += (float) $breakdown['total_owed'];
            $summary['total_paid'] += (float) $breakdown['total_paid'];
            $summary['total_outstanding'] += (float) $breakdown['balance'];
            $summary['total_advance_credit'] += (float) $breakdown['advance_credit'];
            $summary['total_months_behind'] += (int) $breakdown['months_behind'];

            $summaryKey = match ($subscriber->status) {
                'Active' => 'active_subscribers',
                'Unpaid' => 'unpaid_subscribers',
                'Disconnected' => 'disconnected_subscribers',
                default => null,
            };

            if ($summaryKey) {
                $summary[$summaryKey]++;
            }

            if (! isset($planSummary[$planId])) {
                $planSummary[$planId] = [
                    'plan_id' => $planId,
                    'plan_name' => $planName,
                    'subscriber_count' => 0,
                    'total_owed' => 0.0,
                    'total_paid' => 0.0,
                    'total_outstanding' => 0.0,
                    'total_advance_credit' => 0.0,
                ];
            }

            $planSummary[$planId]['subscriber_count']++;
            $planSummary[$planId]['total_owed'] += (float) $breakdown['total_owed'];
            $planSummary[$planId]['total_paid'] += (float) $breakdown['total_paid'];
            $planSummary[$planId]['total_outstanding'] += (float) $breakdown['balance'];
            $planSummary[$planId]['total_advance_credit'] += (float) $breakdown['advance_credit'];
        }

        return [
            'report_type' => 'financial_statement',
            'report_title' => 'Financial Statement',
            'month' => $period['month'],
            'period_label' => $period['label'],
            'period' => [
                'start' => $period['start']->toDateString(),
                'end' => $period['end']->toDateString(),
            ],
            'summary' => $summary,
            'by_plan' => array_values($planSummary),
            'subscribers' => $rows,
        ];
    }

    private function downloadFilename(string $prefix, array $period, string $extension): string
    {
        return $prefix . '_' . $period['month'] . '.' . $extension;
    }

    private function buildCollectionsPdfLines(array $data): array
    {
        $lines = [
            $data['report_title'],
            'Period: ' . $data['period_label'] . ' (' . $data['period']['start'] . ' to ' . $data['period']['end'] . ')',
            '',
            'Summary',
            'Payments: ' . number_format($data['summary']['payment_count']),
            'Paying Subscribers: ' . number_format($data['summary']['paying_subscribers']),
            'Total Collected: PHP ' . number_format($data['summary']['total_collected'], 2),
            '',
            'Collections by Plan',
            'Plan | Subscribers | Payments | Collected',
        ];

        foreach ($data['by_plan'] as $plan) {
            $lines[] = $plan['plan_name'] . ' | ' . number_format($plan['subscriber_count']) . ' | ' . number_format($plan['payment_count']) . ' | PHP ' . number_format($plan['total_collected'], 2);
        }

        $lines[] = '';
        $lines[] = 'Collections by Method';
        $lines[] = 'Method | Subscribers | Payments | Collected';

        foreach ($data['by_method'] as $method) {
            $lines[] = $method['payment_method'] . ' | ' . number_format($method['subscriber_count']) . ' | ' . number_format($method['payment_count']) . ' | PHP ' . number_format($method['total_collected'], 2);
        }

        $lines[] = '';
        $lines[] = 'Payment Ledger';
        $lines[] = 'Date | Subscriber | Plan | OR Number | Method | Amount';

        foreach ($data['payments'] as $payment) {
            $lines[] = implode(' | ', [
                $payment['payment_date'] ?? '—',
                $payment['subscriber_name'] ?? '—',
                $payment['plan_name'] ?? '—',
                $payment['or_number'] ?? '—',
                $payment['payment_method'] ?? '—',
                'PHP ' . number_format($payment['amount'], 2),
            ]);
        }

        return $lines;
    }

    private function buildCollectionsXlsxRows(array $data): array
    {
        $rows = [
            [$data['report_title']],
            ['Period: ' . $data['period_label'] . ' (' . $data['period']['start'] . ' to ' . $data['period']['end'] . ')'],
            [],
            ['Summary'],
            ['Payments', $data['summary']['payment_count']],
            ['Paying Subscribers', $data['summary']['paying_subscribers']],
            ['Total Collected', $data['summary']['total_collected']],
            [],
            ['Collections by Plan'],
            ['Plan', 'Subscribers', 'Payments', 'Collected'],
        ];

        foreach ($data['by_plan'] as $plan) {
            $rows[] = [
                $plan['plan_name'],
                $plan['subscriber_count'],
                $plan['payment_count'],
                $plan['total_collected'],
            ];
        }

        $rows[] = [];
        $rows[] = ['Collections by Method'];
        $rows[] = ['Method', 'Subscribers', 'Payments', 'Collected'];

        foreach ($data['by_method'] as $method) {
            $rows[] = [
                $method['payment_method'],
                $method['subscriber_count'],
                $method['payment_count'],
                $method['total_collected'],
            ];
        }

        $rows[] = [];
        $rows[] = ['Payment Ledger'];
        $rows[] = ['Date', 'Subscriber', 'Plan', 'OR Number', 'Method', 'Amount'];

        foreach ($data['payments'] as $payment) {
            $rows[] = [
                $payment['payment_date'] ?? '—',
                $payment['subscriber_name'] ?? '—',
                $payment['plan_name'] ?? '—',
                $payment['or_number'] ?? '—',
                $payment['payment_method'] ?? '—',
                $payment['amount'],
            ];
        }

        return $rows;
    }

    private function buildFinancialStatementPdfLines(array $data): array
    {
        $lines = [
            $data['report_title'],
            'Period: ' . $data['period_label'] . ' (' . $data['period']['start'] . ' to ' . $data['period']['end'] . ')',
            '',
            'Summary',
            'Subscribers: ' . number_format($data['summary']['subscriber_count']),
            'Total Owed: PHP ' . number_format($data['summary']['total_owed'], 2),
            'Total Paid: PHP ' . number_format($data['summary']['total_paid'], 2),
            'Outstanding: PHP ' . number_format($data['summary']['total_outstanding'], 2),
            'Credit: PHP ' . number_format($data['summary']['total_advance_credit'], 2),
            '',
            'Status Snapshot',
            'Active: ' . number_format($data['summary']['active_subscribers']) . ' | Unpaid: ' . number_format($data['summary']['unpaid_subscribers']) . ' | Disconnected: ' . number_format($data['summary']['disconnected_subscribers']) . ' | Months Behind: ' . number_format($data['summary']['total_months_behind']),
            '',
            'Financial Position by Plan',
            'Plan | Subscribers | Owed | Paid | Outstanding | Credit',
        ];

        foreach ($data['by_plan'] as $plan) {
            $lines[] = $plan['plan_name'] . ' | ' . number_format($plan['subscriber_count']) . ' | PHP ' . number_format($plan['total_owed'], 2) . ' | PHP ' . number_format($plan['total_paid'], 2) . ' | PHP ' . number_format($plan['total_outstanding'], 2) . ' | PHP ' . number_format($plan['total_advance_credit'], 2);
        }

        $lines[] = '';
        $lines[] = 'Subscriber Ledger';
        $lines[] = 'Subscriber | Plan | Status | Monthly Rate | Owed | Paid | Balance | Credit | Months Behind';

        foreach ($data['subscribers'] as $subscriber) {
            $lines[] = implode(' | ', [
                $subscriber['name'] ?? '—',
                $subscriber['plan_name'] ?? '—',
                $subscriber['status'] ?? '—',
                'PHP ' . number_format($subscriber['monthly_rate'], 2),
                'PHP ' . number_format($subscriber['total_owed'], 2),
                'PHP ' . number_format($subscriber['total_paid'], 2),
                'PHP ' . number_format($subscriber['balance'], 2),
                'PHP ' . number_format($subscriber['advance_credit'], 2),
                number_format($subscriber['months_behind']),
            ]);
        }

        return $lines;
    }

    private function buildFinancialStatementXlsxRows(array $data): array
    {
        $rows = [
            [$data['report_title']],
            ['Period: ' . $data['period_label'] . ' (' . $data['period']['start'] . ' to ' . $data['period']['end'] . ')'],
            [],
            ['Summary'],
            ['Subscribers', $data['summary']['subscriber_count']],
            ['Total Owed', $data['summary']['total_owed']],
            ['Total Paid', $data['summary']['total_paid']],
            ['Outstanding', $data['summary']['total_outstanding']],
            ['Credit', $data['summary']['total_advance_credit']],
            [],
            ['Status Snapshot'],
            ['Active', $data['summary']['active_subscribers']],
            ['Unpaid', $data['summary']['unpaid_subscribers']],
            ['Disconnected', $data['summary']['disconnected_subscribers']],
            ['Months Behind', $data['summary']['total_months_behind']],
            [],
            ['Financial Position by Plan'],
            ['Plan', 'Subscribers', 'Owed', 'Paid', 'Outstanding', 'Credit'],
        ];

        foreach ($data['by_plan'] as $plan) {
            $rows[] = [
                $plan['plan_name'],
                $plan['subscriber_count'],
                $plan['total_owed'],
                $plan['total_paid'],
                $plan['total_outstanding'],
                $plan['total_advance_credit'],
            ];
        }

        $rows[] = [];
        $rows[] = ['Subscriber Ledger'];
        $rows[] = ['Subscriber', 'Plan', 'Status', 'Monthly Rate', 'Owed', 'Paid', 'Balance', 'Credit', 'Months Behind'];

        foreach ($data['subscribers'] as $subscriber) {
            $rows[] = [
                $subscriber['name'] ?? '—',
                $subscriber['plan_name'] ?? '—',
                $subscriber['status'] ?? '—',
                $subscriber['monthly_rate'],
                $subscriber['total_owed'],
                $subscriber['total_paid'],
                $subscriber['balance'],
                $subscriber['advance_credit'],
                $subscriber['months_behind'],
            ];
        }

        return $rows;
    }
}
