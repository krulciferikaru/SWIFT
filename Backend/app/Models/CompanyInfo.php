<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyInfo extends Model
{
    protected $table = 'company_info';

    public const FIELDS = ['phone', 'mobile', 'email', 'address', 'office_hours', 'how_to_pay'];

    protected $fillable = self::FIELDS;

    /** The single row, created empty the first time it is needed. */
    public static function current(): self
    {
        return static::query()->firstOrCreate(['id' => 1]);
    }
}
