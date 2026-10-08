<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * Writes one row to the audit trail. Never throws: a logging problem must not
 * stop the action being logged.
 */
class Audit
{
    private const SECRET_FIELDS = ['password', 'remember_token'];

    /**
     * @param string      $action  e.g. "subscriber.updated"
     * @param Model|null  $subject the record acted on
     * @param string|null $label   readable name of the subject when no model is available
     * @param array       $changes ['field' => ['old' => x, 'new' => y]] or any small context array
     */
    public static function log(string $action, ?Model $subject = null, ?string $label = null, array $changes = [], ?User $actor = null): void
    {
        try {
            $actor ??= request()->user();

            AuditLog::create([
                'user_id' => $actor?->id,
                'user_name' => $actor?->name,
                'user_role' => $actor?->role,
                'action' => $action,
                'subject_type' => $subject ? strtolower(class_basename($subject)) : null,
                'subject_id' => $subject?->getKey(),
                'subject_label' => $label ?? $subject?->name ?? $subject?->plan_name ?? null,
                'changes' => $changes ?: null,
                'ip_address' => request()->ip(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Audit log write failed: '.$e->getMessage());
        }
    }

    /**
     * Compares a model's values before and after an update. Call after save()
     * with the model's getOriginal() values captured beforehand.
     */
    public static function diff(array $before, Model $after): array
    {
        $changes = [];
        foreach ($after->getChanges() as $field => $new) {
            if (in_array($field, self::SECRET_FIELDS, true) || $field === 'updated_at') {
                continue;
            }
            $changes[$field] = ['old' => $before[$field] ?? null, 'new' => $new];
        }

        return $changes;
    }
}
