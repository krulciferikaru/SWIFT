<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Why and when a subscriber deleted their own account. */
class AccountDeletion extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['subscriber_id', 'subscriber_name', 'reason', 'detail'];

    /** The reasons offered, shown in this order. */
    public const REASONS = [
        'not_using' => 'I no longer use the service',
        'moved' => 'I moved away',
        'switched' => 'I switched to another provider',
        'price' => 'The service costs too much',
        'privacy' => 'I am worried about my privacy',
        'duplicate' => 'I have another account',
        'other' => 'Another reason',
    ];
}
