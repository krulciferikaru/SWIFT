<?php

namespace App\Http\Controllers;

use App\Models\Barangay;
use App\Models\Subscriber;
use App\Services\Audit;
use App\Support\Text;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BarangayController extends Controller
{
    /** GET /api/barangays (public: the registration form needs it): the addresses on offer, in order. */
    public function index(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => Barangay::activeAddresses()]);
    }

    /** GET /api/barangays/manage (admin): every barangay, switched off ones too, with how many subscribers live there. */
    public function manage(): JsonResponse
    {
        $items = Barangay::ordered()->get()->map(fn (Barangay $b) => [
            'id' => $b->id,
            'name' => $b->name,
            'address' => $b->address,
            'is_active' => $b->is_active,
            'sort_order' => $b->sort_order,
            'subscribers_count' => $b->subscribersCount(),
        ]);

        return response()->json(['success' => true, 'data' => $items]);
    }

    /** POST /api/barangays (admin) */
    public function store(Request $request): JsonResponse
    {
        $name = $this->validatedName($request);

        $barangay = Barangay::create([
            'name' => $name,
            'is_active' => true,
            'sort_order' => (int) Barangay::max('sort_order') + 1,
        ]);

        Audit::log('barangay.created', null, $name);

        return response()->json(['success' => true, 'message' => "Added {$name}.", 'data' => $barangay], 201);
    }

    /**
     * PUT /api/barangays/{id} (admin)
     *
     * Rename and/or switch on or off. A rename also updates the addresses already saved, so nobody
     * is left with an address that is no longer on the list.
     */
    public function update(Request $request, Barangay $barangay): JsonResponse
    {
        $request->validate(['is_active' => ['sometimes', 'boolean']]);
        $name = $request->has('name') ? $this->validatedName($request, $barangay) : $barangay->name;
        $active = $request->has('is_active') ? $request->boolean('is_active') : $barangay->is_active;

        if (! $active && $barangay->is_active && Barangay::active()->count() <= 1) {
            return response()->json(['message' => 'At least one barangay has to stay switched on.'], 422);
        }

        $old = $barangay->only(['name', 'is_active']);

        DB::transaction(function () use ($barangay, $name, $active) {
            if ($name !== $barangay->name) {
                Subscriber::withTrashed()->where('address', $barangay->address)->update(['address' => Barangay::address($name)]);
            }
            $barangay->update(['name' => $name, 'is_active' => $active]);
        });

        $changes = [];
        foreach (['name', 'is_active'] as $field) {
            if ($old[$field] !== $barangay->{$field}) {
                $changes[$field] = ['old' => $old[$field], 'new' => $barangay->{$field}];
            }
        }
        Audit::log('barangay.updated', null, $barangay->name, $changes);

        return response()->json(['success' => true, 'message' => 'Barangay saved.', 'data' => $barangay->fresh()]);
    }

    /** DELETE /api/barangays/{id} (admin; only when no subscriber has it as their address) */
    public function destroy(Barangay $barangay): JsonResponse
    {
        $used = $barangay->subscribersCount();
        if ($used > 0) {
            return response()->json([
                'message' => "{$barangay->name} is the address of {$used} ".($used === 1 ? 'subscriber' : 'subscribers').' and cannot be deleted. Switch it off instead.',
            ], 422);
        }

        if ($barangay->is_active && Barangay::active()->count() <= 1) {
            return response()->json(['message' => 'At least one barangay has to stay switched on.'], 422);
        }

        $barangay->delete();
        Audit::log('barangay.deleted', null, $barangay->name);

        return response()->json(['success' => true, 'message' => 'Barangay deleted.']);
    }

    /** The name as typed, without a trailing ", Palayan City", capitalised, 2 to 60 characters, and not already on the list. */
    private function validatedName(Request $request, ?Barangay $ignore = null): string
    {
        $typed = trim((string) $request->input('name'));
        $typed = trim(preg_replace('/,?\s*palayan city$/i', '', $typed));
        $request->merge(['name' => Text::capitalizeWords($typed)]);

        $validated = $request->validate([
            'name' => [
                'required', 'string', 'min:2', 'max:60', 'not_regex:/,/',
                function ($attribute, $value, $fail) use ($ignore) {
                    $taken = Barangay::whereRaw('LOWER(name) = ?', [mb_strtolower($value)])
                        ->when($ignore, fn ($q) => $q->where('id', '!=', $ignore->id))
                        ->exists();
                    if ($taken) {
                        $fail('That barangay is already on the list.');
                    }
                },
            ],
        ], ['name.not_regex' => 'Type just the barangay name; "Palayan City" is added for you.']);

        return $validated['name'];
    }
}
