<?php

namespace App\Models;

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

    // The staff member's name, so a printed receipt can say who received the payment.
    protected $appends = ['received_by'];

    protected $hidden = ['recordedBy'];

    public function getReceivedByAttribute(): ?string
    {
        return $this->recordedBy?->name;
    }

    protected function casts(): array
    {
        return [
            'payment_date' => 'date',
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