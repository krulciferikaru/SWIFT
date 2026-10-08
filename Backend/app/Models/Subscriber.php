<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Subscriber extends Model
{
    use SoftDeletes;

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
        'password',
        'account_status',
        'mac_address',
        'connection_date',
        'status',
    ];

    protected $hidden = [
        'password',
        'user',
    ];

    protected $appends = ['contact_verified'];

    // Names are stored with each word capitalized, however staff typed them.
    public function setNameAttribute(?string $value): void
    {
        $this->attributes['name'] = \App\Support\Text::capitalizeWords($value);
    }

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
        // withTrashed: an archived plan must keep billing its existing subscribers.
        return $this->belongsTo(Plan::class, 'plan_id', 'plan_id')->withTrashed();
    }

    /** The login account linked to this subscriber, if they have one. */
    public function user(): HasOne
    {
        return $this->hasOne(User::class, 'subscriber_id', 'subscriber_id');
    }

    /** True only when the account's verified number is still the number on this record. */
    public function getContactVerifiedAttribute(): bool
    {
        $user = $this->relationLoaded('user') ? $this->user : null;

        return $user !== null
            && $user->contact_verified_at !== null
            && $user->contact_number === $this->contact_number;
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'subscriber_id', 'subscriber_id');
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
              ->orWhere('contact_number', 'like', "%{$term}%");
        });
    }
}
