<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\PlanChangeRequest;
use App\Models\Subscriber;
use App\Models\User;
use App\Support\BillingCycle;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Moving a subscriber to another plan, the way a service company does it: not an edit, but a request that is
 * carried out within a day or two (24 to 48 hours) and then confirmed by staff. The new price starts with the
 * first statement issued after the confirmation, never touching a bill that has already gone out.
 */
class PlanChangeService
{
    public function __construct(private BillingService $billing, private PhilSmsService $sms) {}

    /** @throws ValidationException when the request cannot be made */
    public function request(Subscriber $subscriber, Plan $to, User $by, ?string $reason = null): PlanChangeRequest
    {
        $problem = null;
        if ($subscriber->account_status !== 'active') {
            $problem = 'Only an active subscriber can change plan.';
        } elseif ($subscriber->status === 'Disconnected') {
            $problem = 'A disconnected subscriber has to be reconnected, after paying what they owe, before changing plan.';
        } elseif (! $subscriber->plan_id) {
            $problem = 'This subscriber has no plan yet. Set one up first.';
        } elseif ((int) $to->plan_id === (int) $subscriber->plan_id) {
            $problem = 'They are already on that plan.';
        } elseif ($to->status !== 'Active' || $to->trashed()) {
            $problem = 'That plan is not available.';
        } elseif ($this->pendingFor($subscriber)) {
            $problem = 'A plan change is already waiting for this subscriber. Confirm or cancel it first.';
        } elseif ($subscriber->connection_date && $this->billing->getBreakdown($subscriber)['balance'] > 0) {
            $problem = 'They have to be paid up before changing plan.';
        }
        if ($problem) {
            throw ValidationException::withMessages(['plan_id' => [$problem]]);
        }

        $change = PlanChangeRequest::create([
            'subscriber_id' => $subscriber->subscriber_id,
            'from_plan_id' => $subscriber->plan_id,
            'to_plan_id' => $to->plan_id,
            'reason' => $reason ? trim($reason) : null,
            'requested_by' => $by->id,
            'requested_at' => now(),
            'earliest_at' => now()->addHours(max(0, (int) config('billing.plan_change_hours', 48))),
        ]);

        Audit::log('plan_change.requested', $subscriber, null, [
            'from' => $subscriber->plan?->plan_name, 'to' => $to->plan_name, 'reason' => $change->reason,
        ]);

        $this->sms->sendToSubscriber($subscriber, sprintf(
            'Hi %s, we received your request to change your plan to %s. It will be carried out within %d hours. The new rate starts with the first statement after that. - Jubal Brothers Cable TV Corp - Palayan Branch',
            $subscriber->name,
            $to->plan_name,
            (int) config('billing.plan_change_hours', 48),
        ));

        return $change->load(['fromPlan', 'toPlan']);
    }

    /** @throws ValidationException when it cannot be confirmed yet */
    public function complete(PlanChangeRequest $change, User $by): PlanChangeRequest
    {
        if ($change->status !== 'pending') {
            throw ValidationException::withMessages(['plan_change' => ['This plan change is already '.$change->status.'.']]);
        }
        if (! $change->isReady()) {
            throw ValidationException::withMessages(['plan_change' => ['It can be confirmed from '.$change->earliest_at->timezone('Asia/Manila')->format('F j, Y g:i A').', once the waiting time has passed.']]);
        }

        $subscriber = Subscriber::findOrFail($change->subscriber_id);
        $to = Plan::withTrashed()->findOrFail($change->to_plan_id);
        $effective = BillingCycle::firstMonthOnNextStatement(Carbon::now('Asia/Manila'));

        DB::transaction(function () use ($change, $subscriber, $to, $by, $effective) {
            $subscriber->planEffectiveFrom = $effective->toDateString();
            $subscriber->plan_id = $to->plan_id;
            $subscriber->save();

            $change->forceFill([
                'status' => 'completed', 'completed_by' => $by->id, 'completed_at' => now(), 'effective_from' => $effective->toDateString(),
            ])->save();
        });

        // A different price can change how far behind they are.
        $this->billing->recalculateStatus($subscriber->fresh());

        Audit::log('plan_change.completed', $subscriber, null, [
            'from' => $change->fromPlan?->plan_name, 'to' => $to->plan_name, 'effective_from' => $effective->toDateString(),
        ]);

        $this->sms->sendToSubscriber($subscriber, sprintf(
            'Hi %s, your plan was changed to %s (PHP %s a month). The new rate applies from %s. - Jubal Brothers Cable TV Corp - Palayan Branch',
            $subscriber->name,
            $to->plan_name,
            number_format((float) $to->monthly_rate, 2),
            $effective->format('F Y'),
        ));

        return $change->fresh(['fromPlan', 'toPlan']);
    }

    public function cancel(PlanChangeRequest $change, User $by): PlanChangeRequest
    {
        if ($change->status !== 'pending') {
            throw ValidationException::withMessages(['plan_change' => ['This plan change is already '.$change->status.'.']]);
        }

        $change->forceFill(['status' => 'cancelled', 'cancelled_by' => $by->id, 'cancelled_at' => now()])->save();

        Audit::log('plan_change.cancelled', Subscriber::withTrashed()->find($change->subscriber_id), null, [
            'from' => $change->fromPlan?->plan_name, 'to' => $change->toPlan?->plan_name,
        ]);

        return $change->fresh(['fromPlan', 'toPlan']);
    }

    public function pendingFor(Subscriber $subscriber): ?PlanChangeRequest
    {
        return PlanChangeRequest::pending()->where('subscriber_id', $subscriber->subscriber_id)->with(['fromPlan', 'toPlan'])->first();
    }
}
