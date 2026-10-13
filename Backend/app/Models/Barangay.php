<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Barangay extends Model
{
    public const CITY = 'Palayan City';

    protected $fillable = ['name', 'is_active', 'sort_order'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'sort_order' => 'integer'];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /** How an address is saved: "Malete, Palayan City". */
    public static function address(string $name): string
    {
        return $name.', '.self::CITY;
    }

    public function getAddressAttribute(): string
    {
        return self::address($this->name);
    }

    /** The addresses people can choose now, in order. */
    public static function activeAddresses(): array
    {
        return static::active()->ordered()->pluck('name')->map(fn ($n) => self::address($n))->all();
    }

    /** How many subscribers (archived ones too) have this barangay as their address. */
    public function subscribersCount(): int
    {
        return Subscriber::withTrashed()->where('address', $this->address)->count();
    }
}
