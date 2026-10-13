import { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import paymentsApi from '../api/payments'
import { errorMessage } from '../utils/errors'
import { pesoText } from '../utils/receipt'
import Modal from './Modal.jsx'
import FormField from './FormField.jsx'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

/**
 * How a payment that was entered wrongly is put right. It is not edited or deleted: it is
 * cancelled, with the reason, and stays in the history. Then the correct payment is recorded as a
 * new one, and the person can have the form filled in with the old details to correct just the
 * part that was wrong (an extra zero, the wrong date).
 *
 * onDone(payment, { prefill }) is called once it is cancelled.
 */
export default function VoidPaymentDialog({ payment, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const [prefill, setPrefill] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (payment) {
      setReason('')
      setTouched(false)
      setPrefill(true)
      setError('')
    }
  }, [payment])

  if (!payment) return null

  const tooShort = reason.trim().length < 5
  const shownError = error || (touched && tooShort ? 'Say a little more about why (at least 5 characters).' : '')

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (tooShort) return
    setBusy(true)
    setError('')
    try {
      const res = await paymentsApi.void(payment.id, reason.trim())
      onDone(res.data.data, { prefill, original: payment })
    } catch (err) {
      setError(err.response?.data?.errors?.reason?.[0] ?? errorMessage(err, 'Could not cancel the payment.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={!!payment}
      onClose={onClose}
      title="Cancel this payment?"
      description="Use this when a payment was entered wrongly. Nothing is deleted."
      size="md"
      footer={() => (
        <div className="flex justify-end gap-3">
          <Button type="submit" form="void-payment-form" variant="outline" disabled={busy} className="border-red-300 bg-transparent text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
            {busy ? 'Cancelling...' : 'Cancel this payment'}
          </Button>
          <Button type="button" onClick={onClose} disabled={busy}>Keep it</Button>
        </div>
      )}
    >
      <form id="void-payment-form" onSubmit={submit} noValidate className="space-y-4 text-sm">
        <dl className="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
          <div className="flex justify-between gap-4 px-3 py-2">
            <dt className="text-gray-500 dark:text-gray-400">Amount</dt>
            <dd className="text-lg font-bold text-gray-900 dark:text-gray-100">{pesoText(payment.amount)}</dd>
          </div>
          <div className="flex justify-between gap-4 px-3 py-2">
            <dt className="text-gray-500 dark:text-gray-400">OR number</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{payment.or_number}</dd>
          </div>
        </dl>

        <ul className="list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
          <li>The payment stays in the history, marked <strong>Cancelled</strong>, with your name and the reason.</li>
          <li>It stops counting towards the balance, the reports and the totals straight away, and the subscriber&apos;s status is worked out again.</li>
          <li>You will be asked for your password, and the cancellation is written to the audit trail.</li>
        </ul>

        <FormField id="void-reason" label="Why is it being cancelled?" required hint='For example: "Typed 5000 instead of 500".' error={shownError}>
          <Textarea value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} onBlur={() => setTouched(true)} maxLength={255} rows={3} />
        </FormField>

        <label className="flex cursor-pointer items-start gap-2.5">
          <Checkbox checked={prefill} onCheckedChange={(v) => setPrefill(!!v)} className="mt-0.5" />
          <span>Fill in the payment form with these details, so I only correct what was wrong.</span>
        </label>

        <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Cancelling does not send a text to the subscriber. If the wrong amount was already texted to them, tell them.</span>
        </p>
      </form>
    </Modal>
  )
}
