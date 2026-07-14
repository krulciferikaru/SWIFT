<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->when($request->filled('role'), fn($query) => $query->where('role', $request->role))
            ->when($request->filled('account_status'), fn($query) => $query->where('account_status', $request->account_status))
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

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(['secretary', 'subscriber'])],
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Role updated.',
            'user' => $user->fresh(),
        ]);
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
