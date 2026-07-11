<?php

namespace App\Http\Controllers;

use App\Models\Subscriber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;

class ReportController extends Controller
{
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
}
