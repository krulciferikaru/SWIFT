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
            width: 20%;
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
        <div class="summary-card"><div class="card"><div class="card-label">Subscribers</div><div class="card-value">{{ number_format($summary['subscriber_count']) }}</div></div></div>
        <div class="summary-card"><div class="card"><div class="card-label">Total Owed</div><div class="card-value">₱{{ number_format($summary['total_owed'], 2) }}</div></div></div>
        <div class="summary-card"><div class="card"><div class="card-label">Total Paid</div><div class="card-value">₱{{ number_format($summary['total_paid'], 2) }}</div></div></div>
        <div class="summary-card"><div class="card"><div class="card-label">Outstanding</div><div class="card-value">₱{{ number_format($summary['total_outstanding'], 2) }}</div></div></div>
        <div class="summary-card"><div class="card"><div class="card-label">Credit</div><div class="card-value">₱{{ number_format($summary['total_advance_credit'], 2) }}</div></div></div>
    </div>

    <div class="section">
        <h2>Status Snapshot</h2>
        <table>
            <thead>
                <tr>
                    <th class="right">Active</th>
                    <th class="right">Unpaid</th>
                    <th class="right">Disconnected</th>
                    <th class="right">Months Behind</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="right">{{ number_format($summary['active_subscribers']) }}</td>
                    <td class="right">{{ number_format($summary['unpaid_subscribers']) }}</td>
                    <td class="right">{{ number_format($summary['disconnected_subscribers']) }}</td>
                    <td class="right">{{ number_format($summary['total_months_behind']) }}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Financial Position by Plan</h2>
        <table>
            <thead>
                <tr>
                    <th>Plan</th>
                    <th class="right">Subscribers</th>
                    <th class="right">Owed</th>
                    <th class="right">Paid</th>
                    <th class="right">Outstanding</th>
                    <th class="right">Credit</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($by_plan as $plan)
                    <tr>
                        <td>{{ $plan['plan_name'] }}</td>
                        <td class="right">{{ number_format($plan['subscriber_count']) }}</td>
                        <td class="right">₱{{ number_format($plan['total_owed'], 2) }}</td>
                        <td class="right">₱{{ number_format($plan['total_paid'], 2) }}</td>
                        <td class="right">₱{{ number_format($plan['total_outstanding'], 2) }}</td>
                        <td class="right">₱{{ number_format($plan['total_advance_credit'], 2) }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="muted">No subscribers available for this period.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Subscriber Ledger</h2>
        <table>
            <thead>
                <tr>
                    <th>Subscriber</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th class="right">Monthly Rate</th>
                    <th class="right">Owed</th>
                    <th class="right">Paid</th>
                    <th class="right">Balance</th>
                    <th class="right">Credit</th>
                    <th class="right">Months Behind</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($subscribers as $subscriber)
                    <tr>
                        <td>{{ $subscriber['name'] }}</td>
                        <td>{{ $subscriber['plan_name'] }}</td>
                        <td>{{ $subscriber['status'] }}</td>
                        <td class="right">₱{{ number_format($subscriber['monthly_rate'], 2) }}</td>
                        <td class="right">₱{{ number_format($subscriber['total_owed'], 2) }}</td>
                        <td class="right">₱{{ number_format($subscriber['total_paid'], 2) }}</td>
                        <td class="right">₱{{ number_format($subscriber['balance'], 2) }}</td>
                        <td class="right">₱{{ number_format($subscriber['advance_credit'], 2) }}</td>
                        <td class="right">{{ number_format($subscriber['months_behind']) }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="9" class="muted">No subscribers available for this period.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</body>
</html>
