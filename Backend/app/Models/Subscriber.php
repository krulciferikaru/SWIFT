<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscriber extends Model
{
    // Your existing table is named 'subscriber' (not 'subscribers')
    protected $table = 'subscriber';

    // Your existing primary key
    protected $primaryKey = 'subscriber_id';

    protected $fillable = [
        'plan_id',
        'name',
        'address',
        'contact_number',
        'email',
        'mac_address',
        'connection_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'connection_date' => 'date',
        ];
    }

    // -----------------------------------------------------------------------
    // Relationships
    // -----------------------------------------------------------------------

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id', 'plan_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'subscriber_id', 'subscriber_id')
                    ->latest('payment_date');
    }

    // -----------------------------------------------------------------------
    // Scopes
    // -----------------------------------------------------------------------

    public function scopeActive($query)
    {
        return $query->where('status', 'Active');
    }

    public function scopeUnpaid($query)
    {
        return $query->where('status', 'Unpaid');
    }

    public function scopeDisconnected($query)
    {
        return $query->where('status', 'Disconnected');
    }

    public function scopeSearch($query, string $term)
    {
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
              ->orWhere('email', 'like', "%{$term}%")
              ->orWhere('address', 'like', "%{$term}%")
              ->orWhere('mac_address', 'like', "%{$term}%")
              ->orWhere('contact', 'like', "%{$term}%");
        });
    }
}
