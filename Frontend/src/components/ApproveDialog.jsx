import { useEffect, useState } from 'react'
import api from '../api/axios'
import planApi from '../api/plans'
import { errorMessage } from '../utils/errors'
import { spelledDate } from '../utils/text'
import Modal from './Modal.jsx'
import FormField from './FormField.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const peso = (value) => `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

const todayHere = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** The month billing starts: the one after the installation month (the installation month is not billed). */
const firstBilledMonth = (iso) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Approving a signup. A person who registers themselves has no service plan and no installation
 * date, and billing needs both, so whoever approves them sets both here first.
 *
 * onApproved(subscriber) is called once the server has approved them.
 */
export default function ApproveDialog({ subscriber, onClose, onApproved }) {
  const [plans, setPlans] = useState([])
  const [plansError, setPlansError] = useState('')
  const [planId, setPlanId] = useState('')
  const [date, setDate] = useState('')
  const [touched, setTouched] = useState({})
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!subscriber) return
    setPlanId(subscriber.plan_id ? String(subscriber.plan_id) : '')
    setDate(subscriber.connection_date ? String(subscriber.connection_date).slice(0, 10) : todayHere())
    setTouched({})
    setErrors({})
    setPlansError('')
    planApi
      .getAll()
      .then((res) => {
        const body = res.data
        const list = Array.isArray(body) ? body : (body?.data?.data ?? body?.data ?? [])
        setPlans(list.filter((p) => p.status === 'Active'))
      })
      .catch(() => setPlansError('The plans could not be loaded. Close this window and try again.'))
  }, [subscriber])

  if (!subscriber) return null

  const local = {
    plan_id: planId ? '' : 'Choose the service plan this subscriber will be on.',
    connection_date: date ? '' : 'Enter the installation date.',
  }
  const fieldError = (key) => errors[key]?.[0] ?? (touched[key] ? local[key] : '')
  const chosen = plans.find((p) => String(p.plan_id) === planId)
  const billing = firstBilledMonth(date)

  const submit = async (e) => {
    e.preventDefault()
    setTouched({ plan_id: true, connection_date: true })
    if (local.plan_id || local.connection_date) return
    setBusy(true)
    setErrors({})
    try {
      await api.patch(`/subscribers/${subscriber.subscriber_id}/approve`, { plan_id: Number(planId), connection_date: date })
      onApproved(subscriber)
    } catch (err) {
      if (err.response?.status === 422 && err.response.data?.errors) setErrors(err.response.data.errors)
      else setErrors({ plan_id: [errorMessage(err, 'Failed to approve this subscriber.')] })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={!!subscriber}
      onClose={onClose}
      title={`Approve ${subscriber.name}`}
      description="Choose their service plan and the day it was (or will be) installed. Billing needs both."
      size="md"
      footer={() => (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="approve-form" disabled={busy || !!plansError} className="bg-green-700 text-white hover:bg-green-800">
            {busy ? 'Approving...' : 'Approve'}
          </Button>
        </div>
      )}
    >
      <form id="approve-form" onSubmit={submit} noValidate className="space-y-4">
        <dl className="grid grid-cols-1 gap-2 rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-900 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Mobile number</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{subscriber.contact_number || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Address</dt>
            <dd className="font-medium text-gray-900 dark:text-gray-100">{subscriber.address || '—'}</dd>
          </div>
        </dl>

        {plansError && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{plansError}</p>}

        <FormField id="approve-plan" label="Service plan" required error={fieldError('plan_id')}
          hint={chosen ? `${peso(chosen.monthly_rate)} a month` : plans.length === 0 && !plansError ? 'Loading plans…' : undefined}>
          <select
            value={planId}
            onChange={(e) => { setPlanId(e.target.value); setErrors(({ plan_id: _gone, ...rest }) => rest) }}
            onBlur={() => setTouched((t) => ({ ...t, plan_id: true }))}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-gray-950"
          >
            <option value="">Select a plan</option>
            {plans.map((p) => (
              <option key={p.plan_id} value={p.plan_id}>{p.plan_name} — {peso(p.monthly_rate)}</option>
            ))}
          </select>
        </FormField>

        <FormField id="approve-date" label="Installation date" required error={fieldError('connection_date')}
          hint={[spelledDate(date), billing ? `Billing starts in ${billing}; the installation month is not billed.` : ''].filter(Boolean).join(' · ')}>
          <Input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setErrors(({ connection_date: _gone, ...rest }) => rest) }}
            onBlur={() => setTouched((t) => ({ ...t, connection_date: true }))}
            className="w-48"
          />
        </FormField>
      </form>
    </Modal>
  )
}
