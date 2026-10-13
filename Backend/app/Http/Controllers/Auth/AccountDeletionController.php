<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AccountDeletion;
use App\Services\AccountDeletionService;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AccountDeletionController extends Controller
{
    public function __construct(private AccountDeletionService $deletion) {}

    /** GET /api/me/delete-account/reasons: the reasons to choose from. */
    public function reasons(): JsonResponse
    {
        $list = [];
        foreach (AccountDeletion::REASONS as $key => $label) {
            $list[] = ['value' => $key, 'label' => $label];
        }

        return response()->json(['data' => $list]);
    }

    /**
     * POST /api/me/delete-account  { password, reason?, detail? }
     *
     * Subscribers only: a staff account is removed by an administrator (set to Inactive), because
     * deleting the last admin would lock everyone out.
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'subscriber') {
            return response()->json(['message' => 'Staff accounts are turned off by an administrator, not deleted here.'], 403);
        }

        $validated = $request->validate([
            'password' => ['required', 'string'],
            'reason' => ['nullable', 'string', Rule::in(array_keys(AccountDeletion::REASONS))],
            'detail' => ['nullable', 'string', 'max:500'],
        ]);

        if (! Hash::check($validated['password'], $user->password)) {
            Audit::log('auth.confirm_failed', $user);

            return response()->json(['message' => 'That password is not correct.', 'errors' => ['password' => ['That password is not correct.']]], 422);
        }

        $this->deletion->delete($user, $validated['reason'] ?? null, $validated['detail'] ?? null);

        return response()->json([
            'message' => 'Your account was deleted. Your login and contact details have been removed.',
        ]);
    }
}
