<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>{{ $report_title }}</title>
    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #1f2937;
            margin: 0;
            padding: 24px;
            background: #ffffff;
        }

        .header {
            margin-bottom: 20px;
        }

        .eyebrow {
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 4px;
        }

        h1 {
            margin: 0 0 6px;
            font-size: 26px;
        }

        .meta {
            color: #4b5563;
            font-size: 13px;
        }

        .summary-grid {
            display: table;
            width: 100%;
            margin: 18px 0 24px;
            border-collapse: separate;
            border-spacing: 0 10px;
        }

        .summary-card {
            display: table-cell;
            width: 25%;
            padding-right: 10px;
            vertical-align: top;
        }

        .card {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 14px;
            background: #f9fafb;
        }

        .card-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 6px;
        }

        .card-value {
            font-size: 20px;
            font-weight: 700;
        }

        .section {
            margin-top: 22px;
        }

        .section h2 {
            font-size: 16px;
            margin: 0 0 10px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        th, td {
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            text-align: left;
            vertical-align: top;
        }

        th {
            background: #f3f4f6;
            font-weight: 700;
        }

        .right {
            text-align: right;
        }

        .muted {
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="eyebrow">SWIFT Reports</div>
        <h1>{{ $report_title }}</h1>
        <div class="meta">Period: {{ $period_label }} ({{ $period['start'] }} to {{ $period['end'] }})</div>
    </div>

    <div class="summary-grid">
        <div class="summary-card"><div class="card"><div class="card-label">Payments</div><div class="card-value">{{ number_format($summary['payment_count']) }}</div></div></div>
        <div class="summary-card"><div class="card"><div class="card-label">Paying Subscribers</div><div class="card-value">{{ number_format($summary['paying_subscribers']) }}</div></div></div>
        <div class="summary-card"><div class="card"><div class="card-label">Total Collected</div><div class="card-value">₱{{ number_format($summary['total_collected'], 2) }}</div></div></div>
        <div class="summary-card"><div class="card"><div class="card-label">Report Month</div><div class="card-value">{{ $month }}</div></div></div>
    </div>

    <div class="section">
        <h2>Collections by Plan</h2>
        <table>
            <thead>
                <tr>
                    <th>Plan</th>
                    <th class="right">Subscribers</th>
                    <th class="right">Payments</th>
                    <th class="right">Collected</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($by_plan as $plan)
                    <tr>
                        <td>{{ $plan['plan_name'] }}</td>
                        <td class="right">{{ number_format($plan['subscriber_count']) }}</td>
                        <td class="right">{{ number_format($plan['payment_count']) }}</td>
                        <td class="right">₱{{ number_format($plan['total_collected'], 2) }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" class="muted">No payments recorded for this period.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Collections by Method</h2>
        <table>
            <thead>
                <tr>
                    <th>Method</th>
                    <th class="right">Subscribers</th>
                    <th class="right">Payments</th>
                    <th class="right">Collected</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($by_method as $method)
                    <tr>
                        <td>{{ $method['payment_method'] }}</td>
                        <td class="right">{{ number_format($method['subscriber_count']) }}</td>
                        <td class="right">{{ number_format($method['payment_count']) }}</td>
                        <td class="right">₱{{ number_format($method['total_collected'], 2) }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" class="muted">No payment methods available for this period.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Payment Ledger</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Subscriber</th>
                    <th>Plan</th>
                    <th>OR Number</th>
                    <th>Method</th>
                    <th class="right">Amount</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($payments as $payment)
                    <tr>
                        <td>{{ $payment['payment_date'] }}</td>
                        <td>{{ $payment['subscriber_name'] ?? '—' }}</td>
                        <td>{{ $payment['plan_name'] }}</td>
                        <td>{{ $payment['or_number'] }}</td>
                        <td>{{ $payment['payment_method'] }}</td>
                        <td class="right">₱{{ number_format($payment['amount'], 2) }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="muted">No payments recorded for this period.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</body>
</html>
