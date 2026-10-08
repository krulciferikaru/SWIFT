import { useEffect, useState } from 'react'
import { BadgeCheck, Smartphone } from 'lucide-react'
import phoneApi from '../api/phone'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Small "Verified" tag for staff views. */
export function VerifiedBadge({ verified }) {
  if (!verified) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      Verified
    </span>
  )
}

const RESEND_SECONDS = 60

/**
 * Lets the signed-in person confirm their mobile number with a texted 6-digit code.
 * `variant="banner"` is the prompt on the dashboard; "card" is the always-visible row in Settings.
 */
export default function PhoneVerification({ variant = 'card' }) {
  const { user, refetch } = useAuth()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  if (!user?.contact_number) return null

  const verified = !!user.contact_verified

  const reset = () => {
    setOpen(false)
    setSent(false)
    setCode('')
    setError('')
    setInfo('')
  }

  const sendCode = async () => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const res = await phoneApi.sendCode()
      setSent(true)
      setInfo(res.data.message)
      setWait(RESEND_SECONDS)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send the code. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await phoneApi.verify(code)
      await refetch()
      reset()
    } catch (err) {
      setError(
        err.response?.data?.errors?.code?.[0] || err.response?.data?.message || 'Could not verify the code. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (verified && variant === 'banner') return null

  const modal = (
    <Modal
      isOpen={open}
      onClose={reset}
      title="Verify your mobile number"
      description={`We will text a 6-digit code to ${user.contact_number}.`}
      size="sm"
      footer={(requestClose) => (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          {sent ? (
            <Button type="submit" form="verify-phone-form" disabled={busy || code.length !== 6}>
              {busy ? 'Checking...' : 'Verify'}
            </Button>
          ) : (
            <Button type="button" onClick={sendCode} disabled={busy}>
              {busy ? 'Sending...' : 'Send code'}
            </Button>
          )}
        </div>
      )}
    >
      {error && (
        <div role="alert" className="mb-3 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}
      {sent ? (
        <form id="verify-phone-form" onSubmit={submit} className="space-y-3">
          {info && <p role="status" className="text-sm text-gray-600 dark:text-gray-400">{info}</p>}
          <div className="space-y-1.5">
            <Label htmlFor="phone-code">6-digit code</Label>
            <Input
              id="phone-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="font-mono tracking-widest text-lg"
              autoFocus
            />
          </div>
          <button
            type="button"
            className="text-sm text-blue-700 dark:text-blue-400 underline disabled:no-underline disabled:text-gray-500 dark:disabled:text-gray-400"
            onClick={sendCode}
            disabled={busy || wait > 0}
          >
            {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This confirms the number is yours, so payment reminders and notices reach you. Standard text-message rates may apply.
        </p>
      )}
    </Modal>
  )

  if (variant === 'banner') {
    return (
      <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="size-5 mt-0.5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Verify your mobile number</p>
              <p className="text-xs text-amber-800 dark:text-amber-400">
                Confirm {user.contact_number} so your payment reminders and notices reach you.
              </p>
            </div>
          </div>
          <Button type="button" onClick={() => setOpen(true)}>Verify now</Button>
        </div>
        {modal}
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Mobile number</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {user.contact_number}{' '}
            {verified ? <VerifiedBadge verified /> : <span>— not verified yet</span>}
          </p>
        </div>
        {!verified && (
          <Button type="button" variant="outline" className="shrink-0" onClick={() => setOpen(true)}>
            Verify
          </Button>
        )}
      </div>
      {modal}
    </>
  )
}
