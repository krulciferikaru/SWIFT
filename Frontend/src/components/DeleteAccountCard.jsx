import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/errors'
import Modal from './Modal.jsx'
import FormField from './FormField.jsx'
import PasswordField from './PasswordField.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

const peso = (value) => `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

/**
 * "Delete my account", at the bottom of Settings, for subscribers. In three short steps, like the
 * big services do it: why (optional), what will happen, and the password to confirm.
 *
 * What is deleted is the login and the contact details. The billing record is kept, because it is
 * the company's financial record: the Privacy Policy explains this, and so does step 2.
 */
export default function DeleteAccountCard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [reasons, setReasons] = useState([])
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [owed, setOwed] = useState(null)
  const [understood, setUnderstood] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // What is owed is shown in step 2, because deleting an account does not cancel a balance.
  useEffect(() => {
    if (!open) return
    api.get('/me/delete-account/reasons').then((res) => setReasons(res.data.data ?? [])).catch(() => {})
    api.get('/me/billing').then((res) => setOwed(Number(res.data?.data?.balance ?? 0))).catch(() => setOwed(null))
  }, [open])

  const reset = () => {
    setOpen(false)
    setStep(1)
    setReason('')
    setDetail('')
    setUnderstood(false)
    setPassword('')
    setError('')
  }

  const deleteNow = async () => {
    setBusy(true)
    setError('')
    try {
      await api.post('/me/delete-account', { password, reason: reason || undefined, detail: detail.trim() || undefined })
      try {
        sessionStorage.setItem('swift.notice', 'Your account was deleted. Your login and contact details have been removed.')
      } catch {
        // the sign-in page just will not say it
      }
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.response?.data?.errors?.password?.[0] ?? errorMessage(err, 'Could not delete the account. Please try again.'))
      setBusy(false)
    }
  }

  return (
    <>
      <Card data-tour="settings-delete" className="border-red-200 dark:border-red-900/60">
        <CardHeader>
          <CardTitle className="text-base text-red-700 dark:text-red-400">Delete my account</CardTitle>
          <CardDescription>
            Remove your login and contact details from SWIFT. Your billing records are kept, as the Privacy Policy explains.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="destructive" onClick={() => setOpen(true)}>Delete my account…</Button>
        </CardContent>
      </Card>

      <Modal
        isOpen={open}
        onClose={reset}
        title={step === 1 ? 'Why are you leaving?' : 'Delete your account?'}
        description={step === 1 ? 'Optional. It helps the company understand what to improve.' : 'Please read this before you confirm.'}
        size="md"
        footer={() => (
          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" onClick={step === 1 ? reset : () => setStep(1)} disabled={busy}>
              {step === 1 ? 'Keep my account' : 'Back'}
            </Button>
            {step === 1 ? (
              <Button type="button" onClick={() => setStep(2)}>Continue</Button>
            ) : (
              <Button type="button" variant="destructive" onClick={deleteNow} disabled={busy || !understood || !password}>
                {busy ? 'Deleting...' : 'Delete my account'}
              </Button>
            )}
          </div>
        )}
      >
        {step === 1 ? (
          <fieldset className="space-y-2">
            <legend className="sr-only">Reason for leaving</legend>
            {reasons.map((r) => (
              <label key={r.value} className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="size-4" />
                {r.label}
              </label>
            ))}
            <FormField id="delete-detail" label="Anything you would like to add" optional className="pt-2">
              <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={500} rows={3} />
            </FormField>
          </fieldset>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1.5 font-semibold text-gray-900 dark:text-gray-100">What will be deleted</p>
              <ul className="list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
                <li>Your login. You will be signed out and cannot sign in again.</li>
                <li>Your mobile number, email and equipment (MAC) address.</li>
              </ul>
            </div>
            <div>
              <p className="mb-1.5 font-semibold text-gray-900 dark:text-gray-100">What is kept</p>
              <ul className="list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
                <li>Your name, address, plan and installation date, and every payment recorded for you. These are the company&apos;s financial records, and its books depend on them. They are kept for the period in the Privacy Policy, then anonymised or destroyed.</li>
              </ul>
            </div>
            {owed > 0 && (
              <p role="alert" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>You still owe <strong>{peso(owed)}</strong>. Deleting your account does not cancel it.</span>
              </p>
            )}
            <label className="flex cursor-pointer items-start gap-2.5">
              <Checkbox checked={understood} onCheckedChange={(v) => setUnderstood(!!v)} className="mt-0.5" />
              <span>I understand that this cannot be undone, and that if I want service again I will have to register again.</span>
            </label>
            <FormField id="delete-password" label="Type your password to confirm" required error={error}>
              <PasswordField value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} autoComplete="current-password" />
            </FormField>
          </div>
        )}
      </Modal>
    </>
  )
}
