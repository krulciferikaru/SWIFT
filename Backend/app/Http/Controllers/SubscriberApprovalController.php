<?php

namespace App\Http\Controllers;

use App\Models\Subscriber;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SubscriberApprovalController extends Controller
{
    public function pending()
    {
        return response()->json(
            Subscriber::where('account_status', 'pending')->get()
        );
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
}