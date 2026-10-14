<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanChangeRequest extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime',
            'earliest_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'effective_from' => 'date',
        ];
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(Subscriber::class, 'subscriber_id', 'subscriber_id')->withTrashed();
    }

    public function fromPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'from_plan_id', 'plan_id')->withTrashed();
    }

    public function toPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'to_plan_id', 'plan_id')->withTrashed();
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /** Wherever a request is sent inside another response (a subscriber, the list), it has the same shape the screens expect. */
    public function toArray(): array
    {
        return \App\Http\Controllers\PlanChangeController::present($this);
    }

    /** Whether staff can confirm it now: pending, and the waiting time has passed. */
    public function isReady(): bool
    {
        return $this->status === 'pending' && $this->earliest_at && $this->earliest_at->lte(now());
    }
}
