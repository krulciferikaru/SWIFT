<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->when($request->filled('role'), fn ($query) => $query->where('role', $request->role))
            ->when($request->filled('account_status'), fn ($query) => $query->where('account_status', $request->account_status))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function ($nested) use ($search) {
                    $nested->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * POST /api/users
     *
     * Creates a dedicated staff account (Admin or Secretary) directly.
     * These accounts are never linked to a subscriber_id and their role
     * can never be changed after creation — role is fixed at creation time
     * as a deliberate security boundary (no privilege escalation path).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email', 'unique:subscriber,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', Rule::in(['admin', 'secretary'])],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'account_status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Staff account created successfully.',
            'user' => $user,
        ], 201);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'account_status' => ['required', Rule::in(['pending', 'active', 'inactive'])],
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Account status updated.',
            'user' => $user->fresh(),
        ]);
    }
}