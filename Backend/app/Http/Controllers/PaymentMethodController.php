<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentMethodController extends Controller
{
    /**
     * GET /api/payment-methods
     *
     * Staff get the active methods, in order, for the payment form and the report filters.
     * An admin asking with ?all=1 also gets inactive ones and how many payments use each.
     */
    public function index(Request $request): JsonResponse
    {
        $all = $request->boolean('all') && $request->user()->hasPermission('users.manage');

        $methods = PaymentMethod::query()
            ->when(! $all, fn ($q) => $q->active())
            ->ordered()
            ->get()
            ->map(fn (PaymentMethod $m) => [
                'id' => $m->id,
                'name' => $m->name,
                'is_active' => $m->is_active,
                'sort_order' => $m->sort_order,
                ...($all ? ['payments_count' => $m->paymentsCount()] : []),
            ]);

        return response()->json(['success' => true, 'data' => $methods]);
    }

    /** POST /api/payment-methods  (admin only) */
    public function store(Request $request): JsonResponse
    {
        $name = $this->validatedName($request);

        $method = PaymentMethod::create([
            'name' => $name,
            'is_active' => true,
            'sort_order' => (int) PaymentMethod::max('sort_order') + 1,
        ]);

        Audit::log('payment_method.created', null, $name);

        return response()->json(['success' => true, 'message' => "Added {$name}.", 'data' => $method], 201);
    }

    /**
     * PUT /api/payment-methods/{id}  (admin only)
     *
     * Rename and/or switch on or off. A rename also updates the payments already recorded
     * under the old name, so the history and the reports stay consistent.
     */
    public function update(Request $request, PaymentMethod $paymentMethod): JsonResponse
    {
        $request->validate(['is_active' => ['sometimes', 'boolean']]);
        $name = $request->has('name') ? $this->validatedName($request, $paymentMethod) : $paymentMethod->name;
        $active = $request->has('is_active') ? $request->boolean('is_active') : $paymentMethod->is_active;

        if (! $active && $paymentMethod->is_active && PaymentMethod::active()->count() <= 1) {
            return response()->json([
                'message' => 'At least one payment method has to stay switched on.',
            ], 422);
        }

        $old = $paymentMethod->only(['name', 'is_active']);

        DB::transaction(function () use ($paymentMethod, $name, $active) {
            if ($name !== $paymentMethod->name) {
                Payment::where('payment_method', $paymentMethod->name)->update(['payment_method' => $name]);
            }
            $paymentMethod->update(['name' => $name, 'is_active' => $active]);
        });

        $changes = [];
        foreach (['name', 'is_active'] as $field) {
            if ($old[$field] !== $paymentMethod->{$field}) {
                $changes[$field] = ['old' => $old[$field], 'new' => $paymentMethod->{$field}];
            }
        }
        Audit::log('payment_method.updated', null, $paymentMethod->name, $changes);

        return response()->json(['success' => true, 'message' => 'Payment method saved.', 'data' => $paymentMethod->fresh()]);
    }

    /** DELETE /api/payment-methods/{id}  (admin only; only when no payment uses it) */
    public function destroy(PaymentMethod $paymentMethod): JsonResponse
    {
        $used = $paymentMethod->paymentsCount();
        if ($used > 0) {
            return response()->json([
                'message' => "{$paymentMethod->name} is used by {$used} recorded ".($used === 1 ? 'payment' : 'payments').' and cannot be deleted. Switch it off instead.',
            ], 422);
        }

        if ($paymentMethod->is_active && PaymentMethod::active()->count() <= 1) {
            return response()->json(['message' => 'At least one payment method has to stay switched on.'], 422);
        }

        $paymentMethod->delete();
        Audit::log('payment_method.deleted', null, $paymentMethod->name);

        return response()->json(['success' => true, 'message' => 'Payment method deleted.']);
    }

    /** The name, trimmed, 2 to 50 characters, and not already taken (ignoring upper/lower case). */
    private function validatedName(Request $request, ?PaymentMethod $ignore = null): string
    {
        $request->merge(['name' => trim((string) $request->input('name'))]);

        $validated = $request->validate([
            'name' => [
                'required', 'string', 'min:2', 'max:50',
                function ($attribute, $value, $fail) use ($ignore) {
                    $taken = PaymentMethod::whereRaw('LOWER(name) = ?', [mb_strtolower($value)])
                        ->when($ignore, fn ($q) => $q->where('id', '!=', $ignore->id))
                        ->exists();
                    if ($taken) {
                        $fail('There is already a payment method with that name.');
                    }
                },
            ],
        ]);

        return $validated['name'];
    }
}
