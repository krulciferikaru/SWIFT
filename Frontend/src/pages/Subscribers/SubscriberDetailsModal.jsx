import { useEffect, useRef, useState } from 'react'
import { CreditCard, Pencil } from 'lucide-react'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import DetailField, { peso, longDate } from '../../components/DetailField'
import { Button } from '@/components/ui/button'
import { useAuth } from '../../context/AuthContext'
import { VerifiedBadge } from '../../components/PhoneVerification.jsx'
import { Skeleton } from '@/components/ui/skeleton'
import paymentsApi from '../../api/payments'

export default function SubscriberDetailsModal({ subscriber, onClose, onEdit, onArchive, onPayments }) {
  const { can } = useAuth()
  const [billing, setBilling] = useState(null)
  const [billingState, setBillingState] = useState('idle') // idle | loading | error

  // Keep showing the last subscriber while the dialog fades out, so it does not go blank.
  const lastSubscriber = useRef(null)
  if (subscriber) lastSubscriber.current = subscriber
  const s = subscriber ?? lastSubscriber.current

  const id = subscriber?.subscriber_id

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setBilling(null)
    setBillingState('loading')
    paymentsApi
      .getBilling(id)
      .then((res) => {
        if (cancelled) return
        setBilling(res.data.data)
        setBillingState('idle')
      })
      .catch(() => {
        if (!cancelled) setBillingState('error')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const plan = s?.plan

  return (
    <Modal
      isOpen={!!subscriber}
      onClose={onClose}
      title={s?.name ?? 'Subscriber'}
      description="Subscriber details"
      size="lg"
      footer={(requestClose) => (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {can('subscribers.archive') ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onArchive(s)}
              aria-label={`Archive ${s?.name}`}
            >
              Archive
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={requestClose}>
              Close
            </Button>
            {can('payments.view', 'payments.record') && (
              <Button type="button" variant="outline" className="gap-1.5" onClick={() => onPayments(s)}>
                <CreditCard className="size-4" />
                Payments
              </Button>
            )}
            {can('subscribers.manage') && (
              <Button type="button" className="gap-1.5" onClick={() => onEdit(s)}>
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
          </div>
        </div>
      )}
    >
      {s && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} />
            {plan?.plan_name && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {plan.plan_name} · {peso(plan.monthly_rate)} per month
              </span>
            )}
          </div>

          <section aria-labelledby="sub-contact-heading">
            <h3 id="sub-contact-heading" className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Contact and connection
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="Contact number">
                {(s.contact || s.contact_number) && (
                  <span className="inline-flex flex-wrap items-center gap-x-2">
                    {s.contact || s.contact_number}
                    <VerifiedBadge verified={s.contact_verified} />
                  </span>
                )}
              </DetailField>
              <DetailField label="Email">{s.email}</DetailField>
              <DetailField label="Address" className="sm:col-span-2">{s.address}</DetailField>
              <DetailField label="MAC address">
                {s.mac_address && <span className="font-mono text-xs">{s.mac_address}</span>}
              </DetailField>
              <DetailField label="Connection date">{longDate(s.connection_date ?? s.installation_date)}</DetailField>
              <DetailField label="Registered">{longDate(s.created_at)}</DetailField>
            </dl>
          </section>

          <section aria-labelledby="sub-billing-heading">
            <h3 id="sub-billing-heading" className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Billing
            </h3>
            {billingState === 'loading' && (
              <div className="grid grid-cols-3 gap-4" aria-busy="true">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            )}
            {billingState === 'error' && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                Billing could not be loaded. You can still open Payments for this subscriber.
              </p>
            )}
            {billing && (
              <dl className="grid grid-cols-3 gap-4">
                <DetailField label="Balance due">
                  <span className={billing.balance > 0 ? 'font-semibold text-red-700 dark:text-red-400' : ''}>
                    {peso(billing.balance)}
                  </span>
                </DetailField>
                <DetailField label="Months behind">{billing.months_behind}</DetailField>
                <DetailField label="Advance credit">{peso(billing.advance_credit)}</DetailField>
              </dl>
            )}
          </section>
        </div>
      )}
    </Modal>
  )
}
