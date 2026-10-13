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
        'terms_accepted_at',
        'terms_version',
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

    /**
     * Keeps the service-status history. A line is added when a subscriber becomes a subscriber
     * (added by staff, or approved) and every time the status really changes after that.
     * Applicants waiting for approval have no history yet: their status means nothing until then.
     */
    /**
     * Set by the code that changes a subscriber's plan when staff choose the month the change
     * starts from (a date in that month). Left empty, the company's default applies.
     */
    public ?string $planEffectiveFrom = null;

    protected static function booted(): void
    {
        // Which plan they are on, month by month (see RateHistoryService).
        static::created(function (Subscriber $subscriber) {
            if ($subscriber->plan_id) {
                app(\App\Services\RateHistoryService::class)->recordSubscriberPlan($subscriber);
            }
        });
        static::updated(function (Subscriber $subscriber) {
            if ($subscriber->wasChanged('plan_id') && $subscriber->plan_id) {
                app(\App\Services\RateHistoryService::class)->recordSubscriberPlan(
                    $subscriber,
                    $subscriber->planEffectiveFrom ? \Carbon\Carbon::parse($subscriber->planEffectiveFrom)->startOfMonth() : null,
                );
            }
        });

        static::created(function (Subscriber $subscriber) {
            if ($subscriber->account_status === 'active') {
                \App\Services\StatusHistoryService::record($subscriber, null, 'created');
            }
        });

        static::updated(function (Subscriber $subscriber) {
            if ($subscriber->account_status !== 'active') {
                return;
            }

            if ($subscriber->wasChanged('account_status') && $subscriber->getOriginal('account_status') !== 'active') {
                \App\Services\StatusHistoryService::record($subscriber, null, 'approved');
            } elseif ($subscriber->wasChanged('status')) {
                \App\Services\StatusHistoryService::record(
                    $subscriber,
                    $subscriber->getOriginal('status'),
                    \App\Services\StatusHistoryService::currentSource(),
                );
            }
        });
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

    /** Set when the subscriber deleted their own account; says why it was archived. */
    public function deletion(): HasOne
    {
        return $this->hasOne(AccountDeletion::class, 'subscriber_id', 'subscriber_id')->latestOfMany();
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

    /** Subscribers installed between two dates (either end may be left open). */
    public function scopeInstalledBetween($query, ?string $from, ?string $to)
    {
        return $query
            ->when($from, fn ($q) => $q->whereDate('connection_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('connection_date', '<=', $to));
    }

    /** @param bool $includePrivate Also match email and MAC address (not for people who can't see them). */
    public function scopeSearch($query, string $term, bool $includePrivate = true)
    {
        return $query->where(function ($q) use ($term, $includePrivate) {
            $q->where('name', 'like', "%{$term}%")
              ->orWhere('address', 'like', "%{$term}%")
              ->orWhere('contact_number', 'like', "%{$term}%");
            if ($includePrivate) {
                $q->orWhere('email', 'like', "%{$term}%")
                  ->orWhere('mac_address', 'like', "%{$term}%");
            }
        });
    }
}
