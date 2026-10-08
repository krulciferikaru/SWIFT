<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'contact_number',
        'password',
        'role',
        'account_status',
        'permissions',
        'subscriber_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['effective_permissions'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
        ];
    }

    /** Every permission key this user holds right now. */
    public function permissionList(): array
    {
        $grantable = array_keys(config('permissions.grantable'));

        return match ($this->role) {
            'admin' => [...$grantable, ...config('permissions.admin_only')],
            // null means "never customised": a secretary gets everything grantable.
            'secretary' => array_values(array_intersect($this->permissions ?? $grantable, $grantable)),
            default => [],
        };
    }

    public function getEffectivePermissionsAttribute(): array
    {
        return $this->permissionList();
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->permissionList(), true);
    }

    public function hasAnyPermission(array $permissions): bool
    {
        return count(array_intersect($permissions, $this->permissionList())) > 0;
    }

    protected static function booted(): void
    {
        static::deleting(function (User $user): void {
            if ($user->subscriber_id && $user->subscriber) {
                $user->subscriber->delete();
            }
        });
    }

    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(Subscriber::class, 'subscriber_id', 'subscriber_id');
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSecretary(): bool
    {
        return $this->role === 'secretary';
    }

    public function isSubscriber(): bool
    {
        return $this->role === 'subscriber';
    }
}