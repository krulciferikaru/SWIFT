<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'subscriber_id',
        'amount',
        'payment_date',
        'or_number',
        'payment_method',
        'notes',
        'recorded_by',
    ];

    /** The scope that hides cancelled payments; name it to ask for them. */
    public const NOT_VOIDED = 'notVoided';

    /**
     * A cancelled (voided) payment is left out of every query by default, so no balance, report or
     * total can count it by accident. History screens ask for them with withVoided().
     */
    protected static function booted(): void
    {
        static::addGlobalScope(self::NOT_VOIDED, function (Builder $query) {
            $query->whereNull($query->getModel()->qualifyColumn('voided_at'));
        });
    }

    /** Include cancelled payments (history, receipts and checks for numbers already used). */
    public static function withVoided(): Builder
    {
        return static::withoutGlobalScope(self::NOT_VOIDED);
    }

    // The staff member's name, so a printed receipt can say who received the payment, and who
    // cancelled it if it was cancelled.
    protected $appends = ['received_by', 'voided_by_name'];

    protected $hidden = ['recordedBy', 'voidedBy'];

    public function getVoidedByNameAttribute(): ?string
    {
        return $this->voided_at ? $this->voidedBy?->name : null;
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function getReceivedByAttribute(): ?string
    {
        return $this->recordedBy?->name;
    }

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
            'voided_at' => 'datetime',
            'amount' => 'decimal:2',
        ];
    }

    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(Subscriber::class, 'subscriber_id', 'subscriber_id')->withTrashed();
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}