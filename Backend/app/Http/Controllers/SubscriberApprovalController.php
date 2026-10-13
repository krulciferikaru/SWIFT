<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use App\Models\Subscriber;
use App\Models\User;
use App\Services\BillingService;
use App\Services\PhilSmsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SubscriberApprovalController extends Controller
{
    public function __construct(private PhilSmsService $sms, private BillingService $billing) {}

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

    /**
     * PATCH /api/subscribers/{subscriber}/approve  { plan_id, connection_date }
     *
     * A person who signs up themselves has no plan and no installation date, and billing needs
     * both, so whoever approves them sets both here. (If they already have them, as a subscriber
     * added by staff would, they are not asked again, though they can be changed.)
     */
    public function approve(Request $request, Subscriber $subscriber)
    {
        $validated = $request->validate([
            'plan_id' => [
                Rule::requiredIf(! $subscriber->plan_id),
                'nullable',
                'integer',
                // Only a plan that is currently offered can be given to someone new.
                Rule::exists('plan', 'plan_id')->whereNull('deleted_at')->where('status', 'Active'),
            ],
            'connection_date' => [
                Rule::requiredIf(! $subscriber->connection_date),
                'nullable',
                'date_format:Y-m-d',
                'after_or_equal:2000-01-01',
                'before_or_equal:'.now()->addDays(60)->toDateString(),
            ],
        ], [
            'plan_id.required' => 'Choose the service plan this subscriber will be on.',
            'plan_id.exists' => 'Choose one of the plans that are currently offered.',
            'connection_date.required' => 'Enter the installation date.',
            'connection_date.before_or_equal' => 'The installation date cannot be more than 60 days away.',
        ]);

        // Set the plan and the date first, and work the status out from them while the person is
        // still an applicant, so the history starts with the right status.
        $subscriber->fill(array_filter([
            'plan_id' => $validated['plan_id'] ?? null,
            'connection_date' => $validated['connection_date'] ?? null,
        ]))->save();
        $this->billing->recalculateStatus($subscriber->fresh());
        $subscriber = $subscriber->fresh();

        $user = User::updateOrCreate(
            ['subscriber_id' => $subscriber->subscriber_id],
            [
                'name' => $subscriber->name,
                'email' => $subscriber->email,
                'contact_number' => $subscriber->contact_number,
                // A subscriber added by staff has no password. They get an unknowable one and set their
                // own with Forgot password once their mobile number is verified.
                'password' => $subscriber->password ?: Hash::make(Str::random(40)),
                'role' => 'subscriber',
                'account_status' => 'active',
                // What they agreed to at registration carries over to their login.
                'terms_accepted_at' => $subscriber->terms_accepted_at,
                'terms_version' => $subscriber->terms_version,
            ]
        );

        $subscriber->update(['account_status' => 'active']);

        Audit::log('approval.approved', $subscriber, null, [
            'plan_id' => $subscriber->plan_id,
            'connection_date' => $subscriber->connection_date?->toDateString(),
        ]);

        $this->sms->sendToSubscriber($subscriber, sprintf(
            'Hi %s, your subscriber application has been approved. You may now log in. Welcome aboard! - Jubal Brothers Cable TV Corp - Palayan Branch',
            $subscriber->name,
        ));

        return response()->json(['message' => 'Subscriber approved.', 'subscriber' => $subscriber->fresh(), 'user' => $user->fresh()]);
    }

    public function reject(Subscriber $subscriber)
    {
        $subscriber->update(['account_status' => 'rejected']);

        Audit::log('approval.rejected', $subscriber);

        $this->sms->sendToSubscriber($subscriber, sprintf(
            'Hi %s, your subscriber application was not approved at this time. Please contact us for more information. - Jubal Brothers Cable TV Corp - Palayan Branch',
            $subscriber->name,
        ));

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

        // They deleted their account earlier and are back: the "deleted their account" note no longer
        // applies (the audit trail keeps the history), and texts to them can resume.
        if ($user->subscriber_id) {
            \App\Models\AccountDeletion::where('subscriber_id', $user->subscriber_id)->delete();
        }

        Audit::log('claim.approved', $user);

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

        Audit::log('claim.rejected', $user);

        return response()->json(['message' => 'Account claim rejected.']);
    }
}
