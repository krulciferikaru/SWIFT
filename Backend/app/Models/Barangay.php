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

    /** The barangay names people can choose now, in order (the city is always Palayan City). */
    public static function activeNames(): array
    {
        return static::active()->ordered()->pluck('name')->all();
    }

    /** The full address text kept for lists, search and reports: "12 Rizal St, Malete, Palayan City". */
    public static function compose(?string $street, string $name): string
    {
        $street = trim((string) $street);

        return ($street !== '' ? $street.', ' : '').self::address($name);
    }

    /**
     * Splits "12 Rizal St, Malete, Palayan City" (or just "Malete, Palayan City") into its street and barangay,
     * when it ends with one of the barangays on the list. Anything else is not an address we can split.
     *
     * @return array{0: ?string, 1: string}|null [street, barangay], or null
     */
    public static function split(?string $address): ?array
    {
        $address = trim((string) $address);
        if ($address === '') {
            return null;
        }

        foreach (static::ordered()->pluck('name') as $name) {
            $exact = self::address($name);
            if (strcasecmp($address, $exact) === 0) {
                return [null, $name];
            }
            $suffix = ', '.$exact;
            if (str_ends_with(strtolower($address), strtolower($suffix))) {
                $street = trim(substr($address, 0, strlen($address) - strlen($suffix)));

                return [$street !== '' ? $street : null, $name];
            }
        }

        return null;
    }

    /** How many subscribers (archived ones too) are in this barangay. */
    public function subscribersCount(): int
    {
        return Subscriber::withTrashed()
            ->where(fn ($q) => $q->where('barangay', $this->name)->orWhere(fn ($q2) => $q2->whereNull('barangay')->where('address', $this->address)))
            ->count();
    }
}
