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
            ->where('account_status', 'active')
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

        $query->installedBetween($request->input('installed_from'), $request->input('installed_to'));

        $subscribers = $query->orderBy('name')->get();

        return $this->exports->downloadCsv(
            'subscribers_report_' . now()->format('Ymd_His') . '.csv',
            $this->buildSubscribersXlsxRows($subscribers)
        );
    }

    public function subscribersXlsx(Request $request)
    {
        $query = Subscriber::with('plan')
            ->where('account_status', 'active')
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

        $query->installedBetween($request->input('installed_from'), $request->input('installed_to'));

        $subscribers = $query->orderBy('name')->get();

        return $this->exports->downloadXlsx(
            'subscribers_report_' . now()->format('Ymd_His') . '.xlsx',
            $this->buildSubscribersXlsxRows($subscribers)
        );
    }

    public function collections(Request $request): JsonResponse
    {
        $period = $this->resolvePeriod($request);
        $data = $this->buildCollectionsData($period, $this->resolveFilters($request));

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    public function collectionsPdf(Request $request)
    {
        $period = $this->resolvePeriod($request);
        $data = $this->buildCollectionsData($period, $this->resolveFilters($request));

        return $this->exports->downloadPdf(
            $this->downloadFilename('collections_report', $period, 'pdf'),
            'reports.collections',
            $data
        );
    }

    public function collectionsXlsx(Request $request)
    {
        $period = $this->resolvePeriod($request);
        $data = $this->buildCollectionsData($period, $this->resolveFilters($request));

        return $this->exports->downloadXlsx(
            $this->downloadFilename('collections_report', $period, 'xlsx'),
            $this->buildCollectionsXlsxRows($data)
        );
    }

    /**
     * Resolves the report window from ?range=monthly|three_months|annual|custom.
     *   custom        -> ?from=YYYY-MM-DD&to=YYYY-MM-DD (at most 5 years; never past today)
     *   monthly       -> ?month=YYYY-MM (defaults to the current month)
     *   three_months  -> rolling window: the same day 3 months ago through today
     *   annual        -> ?year=YYYY (defaults to the current year; the current
     *                    year stops at today so future months aren't billed)
     */
    private function resolvePeriod(Request $request): array
    {
        $validated = $request->validate([
            'range' => ['nullable', 'in:monthly,three_months,annual,custom'],
            'month' => ['nullable', 'date_format:Y-m'],
            'year' => ['nullable', 'date_format:Y'],
            'from' => ['required_if:range,custom', 'nullable', 'date_format:Y-m-d'],
            'to' => [
                'required_if:range,custom', 'nullable', 'date_format:Y-m-d', 'after_or_equal:from',
                function ($attribute, $value, $fail) use ($request) {
                    $from = $request->input('from');
                    if ($from && $value && Carbon::parse($from)->diffInDays(Carbon::parse($value)) > 1830) {
                        $fail('Choose a date range of 5 years or less.');
                    }
                },
            ],
        ]);

        $range = $validated['range'] ?? 'monthly';
        $today = now()->endOfDay();

        if ($range === 'custom') {
            $start = Carbon::createFromFormat('Y-m-d', $validated['from'])->startOfDay();
            $end = Carbon::createFromFormat('Y-m-d', $validated['to'])->endOfDay();
            $label = $start->format('M j, Y') . ' - ' . $end->format('M j, Y');
            $key = $start->toDateString() . '_to_' . $end->toDateString();
            // Nothing is billed or collected in the future.
            if ($end->gt($today)) {
                $end = $today;
            }
        } elseif ($range === 'three_months') {
            $start = now()->subMonths(3)->startOfDay();
            $end = $today;
            $key = 'last-3-months';
            $label = 'Last 3 Months (' . $start->format('M j, Y') . ' - ' . $end->format('M j, Y') . ')';
        } elseif ($range === 'annual') {
            $year = $validated['year'] ?? now()->format('Y');
            $start = Carbon::createFromFormat('Y-m-d', $year . '-01-01')->startOfDay();
            $end = $start->copy()->endOfYear();
            if ($end->gt($today)) {
                $end = $today;
            }
            $key = $year;
            $label = 'Year ' . $year;
        } else {
            $month = $validated['month'] ?? now()->format('Y-m');
            $start = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $key = $month;
            $label = $start->format('F Y');
        }

        return [
            'range' => $range,
            'month' => $key,
            'label' => $label,
            'start' => $start,
            'end' => $end,
        ];
    }

    /**
     * Optional narrowing for the on-screen report and the PDF / Excel files:
     * ?subscriber_id= ?plan_id= ?payment_method= ?or_number=
     */
    private function resolveFilters(Request $request): array
    {
        $v = $request->validate([
            'subscriber_id' => ['nullable', 'integer', 'exists:subscriber,subscriber_id'],
            'plan_id' => ['nullable', 'integer', 'exists:plan,plan_id'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'or_number' => ['nullable', 'string', 'max:50'],
        ]);

        return [
            'subscriber_id' => isset($v['subscriber_id']) ? (int) $v['subscriber_id'] : null,
            'plan_id' => isset($v['plan_id']) ? (int) $v['plan_id'] : null,
            'payment_method' => ($v['payment_method'] ?? '') !== '' ? $v['payment_method'] : null,
            'or_number' => ($v['or_number'] ?? '') !== '' ? trim($v['or_number']) : null,
        ];
    }

    /** The filters in words, for the top of a report: ["Subscriber: Juan Cruz", "Payment method: GCash"]. */
    private function filterLabels(array $filters, array $use): array
    {
        $labels = [];

        if (in_array('subscriber_id', $use, true) && $filters['subscriber_id']) {
            $name = Subscriber::withTrashed()->find($filters['subscriber_id'])?->name;
            $labels[] = 'Subscriber: ' . ($name ?? '#' . $filters['subscriber_id']);
        }
        if (in_array('plan_id', $use, true) && $filters['plan_id']) {
            $name = \App\Models\Plan::withTrashed()->find($filters['plan_id'])?->plan_name;
            $labels[] = 'Plan: ' . ($name ?? '#' . $filters['plan_id']);
        }
        if (in_array('payment_method', $use, true) && $filters['payment_method']) {
            $labels[] = 'Payment method: ' . $filters['payment_method'];
        }
        if (in_array('or_number', $use, true) && $filters['or_number']) {
            $labels[] = 'OR number contains: ' . $filters['or_number'];
        }

        return $labels;
    }

    private function buildCollectionsData(array $period, array $filters = []): array
    {
        $filters += ['subscriber_id' => null, 'plan_id' => null, 'payment_method' => null, 'or_number' => null];

        $baseQuery = Payment::query()
            ->whereBetween('payment_date', [
                $period['start']->toDateString(),
                $period['end']->toDateString(),
            ])
            ->when($filters['subscriber_id'], fn ($q, $id) => $q->where('subscriber_id', $id))
            ->when($filters['payment_method'], fn ($q, $m) => $q->where('payment_method', $m))
            ->when($filters['or_number'], fn ($q, $or) => $q->where('or_number', 'like', '%' . $or . '%'))
            ->when($filters['plan_id'], fn ($q, $plan) => $q->whereHas('subscriber', fn ($s) => $s->where('plan_id', $plan)));

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
            ->when($filters['subscriber_id'], fn ($q, $id) => $q->where('payments.subscriber_id', $id))
            ->when($filters['payment_method'], fn ($q, $m) => $q->where('payments.payment_method', $m))
            ->when($filters['or_number'], fn ($q, $or) => $q->where('payments.or_number', 'like', '%' . $or . '%'))
            ->when($filters['plan_id'], fn ($q, $plan) => $q->where('subscriber.plan_id', $plan))
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
            'report_title' => 'Collection Report',
            'range' => $period['range'],
            'month' => $period['month'],
            'period_label' => $period['label'],
            'period' => [
                'start' => $period['start']->toDateString(),
                'end' => $period['end']->toDateString(),
            ],
            'filters' => $filters,
            'filter_labels' => $this->filterLabels($filters, ['subscriber_id', 'plan_id', 'payment_method', 'or_number']),
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

    private function downloadFilename(string $prefix, array $period, string $extension): string
    {
        return $prefix . '_' . $period['month'] . '.' . $extension;
    }

    private function buildSubscribersXlsxRows($subscribers): array
    {
        $rows = [
            ['Subscriber ID', 'Name', 'Plan', 'Address', 'Contact Number', 'Email', 'MAC Address', 'Connection Date', 'Status', 'Created At'],
        ];

        foreach ($subscribers as $subscriber) {
            $rows[] = [
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
            ];
        }

        return $rows;
    }

    private function buildCollectionsXlsxRows(array $data): array
    {
        $rows = [
            [$data['report_title']],
            ['Period: ' . $data['period_label'] . ' (' . $data['period']['start'] . ' to ' . $data['period']['end'] . ')'],
            ['Filters: ' . ($data['filter_labels'] ? implode('; ', $data['filter_labels']) : 'none')],
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
}
