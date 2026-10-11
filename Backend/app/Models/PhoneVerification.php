<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PhoneVerification extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'phone', 'code_hash', 'expires_at', 'attempts'];

    protected $hidden = ['code_hash'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'created_at' => 'datetime'];
    }
}
