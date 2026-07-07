<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class SubscriberApprovalController extends Controller
{
    public function pending()
    {
        return response()->json(
            User::where('role', 'subscriber')->where('account_status', 'pending')->get()
        );
    }

    public function approve(User $user)
    {
        $user->update(['account_status' => 'active']);
        return response()->json(['message' => 'Subscriber approved.', 'user' => $user]);
    }

    public function reject(User $user)
    {
        $user->update(['account_status' => 'rejected']);
        return response()->json(['message' => 'Subscriber rejected.', 'user' => $user]);
    }
}