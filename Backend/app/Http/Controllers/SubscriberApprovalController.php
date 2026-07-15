<?php

namespace App\Http\Controllers;

use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SubscriberApprovalController extends Controller
{
    public function pending(Request $request)
    {
        $query = Subscriber::where('account_status', 'pending');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($nested) use ($search) {
                $nested->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('contact_number', 'like', "%{$search}%");
            });
        }

        return response()->json($query->get());
    }

    public function approve(Subscriber $subscriber)
    {
        $user = User::updateOrCreate(
            ['subscriber_id' => $subscriber->subscriber_id],
            [
                'name' => $subscriber->name,
                'email' => $subscriber->email,
                'contact_number' => $subscriber->contact_number,
                'password' => $subscriber->password,
                'role' => 'subscriber',
                'account_status' => 'active',
            ]
        );

        $subscriber->update(['account_status' => 'active']);

        return response()->json(['message' => 'Subscriber approved.', 'subscriber' => $subscriber->fresh(), 'user' => $user->fresh()]);
    }

    public function reject(Subscriber $subscriber)
    {
        $subscriber->update(['account_status' => 'rejected']);
        return response()->json(['message' => 'Subscriber rejected.', 'subscriber' => $subscriber->fresh()]);
    }

    public function pendingClaims()
    {
        return response()->json(
            User::where('account_status', 'pending')
                ->whereNotNull('subscriber_id')
                ->with('subscriber')
                ->latest()
                ->get()
        );
    }

    public function rejectedClaims()
    {
        return response()->json(
            User::where('account_status', 'inactive')
                ->whereNotNull('subscriber_id')
                ->with('subscriber')
                ->latest()
                ->get()
        );
    }

    public function approveClaim(User $user)
    {
        $user->update(['account_status' => 'active']);

        return response()->json([
            'message' => 'Account claim approved.',
            'user' => $user->fresh(),
        ]);
    }

    public function rejectClaim(User $user)
    {
        // Soft-mark as inactive instead of deleting, so rejected claims remain visible as history.
        // Uses a direct query update (not $user->update()) to be explicit this bypasses no model events.
        User::where('id', $user->id)->update(['account_status' => 'inactive']);

        return response()->json(['message' => 'Account claim rejected.']);
    }
}
