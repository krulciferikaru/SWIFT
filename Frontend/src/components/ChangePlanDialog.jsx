import { useState } from 'react'
import planChangeApi from '../api/planChanges'
import Modal from './Modal'
import ConfirmAction from './ConfirmAction'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const peso = (v) => `₱${Number(v ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
const when = (iso) => new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
const monthName = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })

/**
 * Moving a subscriber to another plan. Never an edit: it is requested, waits 24 to 48 hours, then staff confirm
 * it once it has been carried out (or cancel it). The new price starts with the first statement after the
 * confirmation, so a bill that already went out is never re-priced.
 */
export default function ChangePlanDialog({ subscriber, plans, onClose, onDone }) {
  const pending = subscriber?.pending_plan_change ?? null
  const [planId, setPlanId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [askCancel, setAskCancel] = useState(false)
  const [sure, setSure] = useState(false) // asked to confirm before the waiting time is over

  if (!subscriber) return null
  const options = plans.filter((p) => p.status === 'Active' && p.plan_id !== subscriber.plan_id)

  const run = async (call, fallback) => {
    setBusy(true)
    setError('')
    try {
      const res = await call()
      onDone(res.data?.message)
    } catch (err) {
      const errors = err.response?.data?.errors
      setError((errors && Object.values(errors)[0]?.[0]) || err.response?.data?.message || fallback)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={pending ? 'Plan change pending' : 'Change plan'}
      description={subscriber.name}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{pending ? (
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => (pending.ready || sure ? run(() => planChangeApi.complete(pending.id, !pending.ready), 'Could not confirm the change.') : setSure(true))}
            >
              {pending.ready ? 'Confirm the change' : sure ? 'Yes, it was already carried out' : 'Confirm now'}
            </Button>
            <Button disabled={busy} onClick={() => setAskCancel(true)}>
              Cancel the change
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" disabled={busy} onClick={onClose}>Close</Button>
            <Button
              disabled={busy || !planId}
              onClick={() => run(() => planChangeApi.request(subscriber.subscriber_id, { plan_id: Number(planId), reason: reason || undefined }), 'Could not request the change.')}
            >
              Request change
            </Button>
          </>
        )}</div>
      }
    >
      <div className="space-y-4 text-sm">
        {pending ? (
          <>
            <p>
              {pending.from_plan} → <strong>{pending.to_plan}</strong> ({peso(pending.to_rate)} per month)
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Requested {when(pending.requested_at)}. It can be confirmed from {when(pending.earliest_at)}, once the change has been carried out.
              {pending.expected_from && <> If confirmed today, the new price starts with the bill for {monthName(pending.expected_from)}.</>}
            </p>
            {!pending.ready && (
              <p className={sure ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}>
                The usual wait is not over yet. If the change has already been carried out, you can confirm it now{sure ? ': is it really done?' : '.'}
              </p>
            )}
            {pending.reason && <p className="text-gray-600 dark:text-gray-400">Reason: {pending.reason}</p>}
          </>
        ) : (
          <>
            <p className="text-gray-600 dark:text-gray-400">
              Now on <strong>{subscriber.plan?.plan_name}</strong>. A change waits 24 to 48 hours, then is confirmed once carried out.
              The subscriber stays Active meanwhile and must be fully paid up.
            </p>
            <div className="space-y-1.5">
              <Label>New plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger aria-label="New plan" className="w-full"><SelectValue placeholder="Select a plan">
                    {options.find((p) => String(p.plan_id) === planId) ? `${options.find((p) => String(p.plan_id) === planId).plan_name} — ${peso(options.find((p) => String(p.plan_id) === planId).monthly_rate)}` : null}
                  </SelectValue></SelectTrigger>
                <SelectContent>
                  {options.map((p) => (
                    <SelectItem key={p.plan_id} value={String(p.plan_id)}>{p.plan_name} — {peso(p.monthly_rate)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-change-reason">Reason (optional)</Label>
              <Input id="plan-change-reason" value={reason} maxLength={255} onChange={(e) => setReason(e.target.value)} />
            </div>
          </>
        )}
        {error && <p role="alert" className="text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <ConfirmAction
        open={askCancel}
        onOpenChange={setAskCancel}
        title="Cancel this plan change?"
        description={pending ? <>The request to move <strong>{subscriber.name}</strong> from {pending.from_plan} to <strong>{pending.to_plan}</strong> will be cancelled. Their plan stays as it is.</> : null}
        confirmLabel="Cancel the change"
        busy={busy}
        destructive
        onConfirm={() => run(() => planChangeApi.cancel(pending.id), 'Could not cancel the change.')}
      />
    </Modal>
  )
}
