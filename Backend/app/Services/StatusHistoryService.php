<?php

namespace App\Services;

use App\Models\Subscriber;
use App\Models\SubscriberStatusChange;
use Illuminate\Support\Facades\Auth;

/** Keeping and reading a subscriber's service-status history. */
class StatusHistoryService
{
    /** Set by code that changes statuses on the system's own initiative (see BillingService). */
    public static ?string $source = null;

    /** Adds a line. Called from the Subscriber model whenever its status really changes. */
    public static function record(Subscriber $subscriber, ?string $previous, string $source): void
    {
        SubscriberStatusChange::create([
            'subscriber_id' => $subscriber->subscriber_id,
            'status' => $subscriber->status,
            'previous_status' => $previous,
            'source' => $source,
            'changed_by' => in_array($source, ['staff', 'created', 'approved'], true) ? Auth::id() : null,
        ]);
    }

    /** Who or what is making a change right now. */
    public static function currentSource(): string
    {
        return self::$source ?? (Auth::check() ? 'staff' : 'system');
    }

    /**
     * The timeline for one subscriber, newest first, with the installation date.
     * Staff see who made a change; the subscriber sees what changed and when.
     */
    public function timeline(Subscriber $subscriber, bool $forStaff): array
    {
        $rows = SubscriberStatusChange::where('subscriber_id', $subscriber->subscriber_id)
            ->with($forStaff ? 'changedBy:id,name' : [])
            ->orderByDesc('id')
            ->get();

        $current = $rows->first();
        $start = $rows->firstWhere('source', 'start');

        return [
            'installation_date' => $subscriber->connection_date?->toDateString(),
            'current_status' => $subscriber->status,
            // When the current status began (the latest line).
            'current_since' => $current?->created_at?->toIso8601String(),
            // Changes before this day were not recorded.
            'history_began_at' => $start?->created_at?->toIso8601String(),
            'events' => $rows->map(fn ($row) => [
                'id' => $row->id,
                'status' => $row->status,
                'previous_status' => $row->previous_status,
                'source' => $row->source,
                'changed_at' => $row->created_at?->toIso8601String(),
                'changed_by' => $forStaff ? $row->changedBy?->name : null,
            ])->values()->all(),
        ];
    }
}
