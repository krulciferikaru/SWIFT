import { useEffect, useState } from 'react'
import { ShieldCheck, TriangleAlert } from 'lucide-react'
import api from '../api/axios'
import { errorMessage } from '../utils/errors'
import Modal from './Modal.jsx'
import FormField from './FormField.jsx'
import RecoveryCodes from './RecoveryCodes.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * For administrators, in Settings: that two-step sign-in is on, how many recovery codes are left,
 * and a way to replace them (which needs a current code from the app, so a stolen sign-in alone
 * cannot do it).
 */
export default function SecurityCard() {
  const [status, setStatus] = useState(null)
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [codes, setCodes] = useState(null)

  const load = () => api.get('/me/mfa').then((res) => setStatus(res.data)).catch(() => setStatus(null))
  useEffect(() => {
    load()
  }, [])

  const close = () => {
    setOpen(false)
    setCode('')
    setError('')
    setCodes(null)
    load()
  }

  const renew = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api.post('/me/mfa/recovery-codes', { code: code.trim() })
      setCodes(res.data.recovery_codes)
    } catch (err) {
      setError(err.response?.data?.errors?.code?.[0] ?? errorMessage(err, 'Could not get new codes.'))
    } finally {
      setBusy(false)
    }
  }

  if (!status) return null
  const low = status.recovery_codes_left <= 2

  return (
    <>
      <Card data-tour="settings-security">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-green-700 dark:text-green-400" aria-hidden="true" />
            Two-step sign-in
          </CardTitle>
          <CardDescription>
            On{status.enabled_at ? ` since ${new Date(status.enabled_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}.
            Signing in needs a 6-digit code from your authenticator app as well as your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Recovery codes left: <strong>{status.recovery_codes_left}</strong>
          </p>
          {low && (
            <p role="alert" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              You are running low. Get a new set so you are not locked out if you lose your phone.
            </p>
          )}
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>Get new recovery codes</Button>
        </CardContent>
      </Card>

      <Modal
        isOpen={open}
        onClose={close}
        title="New recovery codes"
        description={codes ? 'The old codes no longer work.' : 'Type the current code from your authenticator app to continue.'}
        size="md"
        footer={() => (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={close}>{codes ? 'Done' : 'Cancel'}</Button>
            {!codes && <Button type="submit" form="renew-codes-form" disabled={busy || code.trim().length < 6}>{busy ? 'Checking...' : 'Get new codes'}</Button>}
          </div>
        )}
      >
        {codes ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">Keep these somewhere safe. <strong>They are shown only now.</strong></p>
            <RecoveryCodes codes={codes} />
          </div>
        ) : (
          <form id="renew-codes-form" onSubmit={renew} noValidate>
            <FormField id="renew-code" label="6-digit code" error={error}>
              <Input value={code} onChange={(e) => { setCode(e.target.value); setError('') }} inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" className="w-40 text-center font-mono text-lg tracking-[0.3em]" />
            </FormField>
          </form>
        )}
      </Modal>
    </>
  )
}
