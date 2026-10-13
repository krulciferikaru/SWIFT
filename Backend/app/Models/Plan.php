<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    use SoftDeletes;

    // Your existing table is named 'plan' (not 'plans')
    protected $table = 'plan';

    // Your existing primary key
    protected $primaryKey = 'plan_id';

    protected $fillable = [
        'plan_name',
        'monthly_rate',
        'description',
        'speed_mbps',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'monthly_rate' => 'decimal:2',
        ];
    }

    /**
     * Remembers what a plan cost and from when, so changing the price never re-prices a month
     * that has already been billed (see RateHistoryService).
     */
    protected static function booted(): void
    {
        static::created(fn (Plan $plan) => app(\App\Services\RateHistoryService::class)->recordPlanCreated($plan));

        static::updated(function (Plan $plan) {
            if ($plan->wasChanged('monthly_rate')) {
                app(\App\Services\RateHistoryService::class)->recordPlanRateChange($plan);
            }
        });
    }

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function subscribers(): HasMany
    {
        return $this->hasMany(Subscriber::class, 'plan_id', 'plan_id');
    }

    // -----------------------------------------------------------------------
    // Accessors
    // -----------------------------------------------------------------------

    /**
     * Formatted monthly rate: "₱300.00"
     */
    public function getFormattedRateAttribute(): string
    {
        return '₱' . number_format($this->monthly_rate, 2);
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('status', 'Active');
    }

    public function getRouteKey():string
    {
        return $this->plan_id;
    }
}
