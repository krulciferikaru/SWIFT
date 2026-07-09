<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
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
