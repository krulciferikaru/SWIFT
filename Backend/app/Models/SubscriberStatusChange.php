<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One line of a subscriber's service-status history. Lines are only ever added. */
class SubscriberStatusChange extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'subscriber_status_history';

    protected $fillable = ['subscriber_id', 'status', 'previous_status', 'source', 'changed_by'];

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
