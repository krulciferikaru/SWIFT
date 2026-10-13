import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ShieldOff, Smartphone, TriangleAlert } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/errors'
import Modal from './Modal.jsx'
import FormField from './FormField.jsx'
import RecoveryCodes from './RecoveryCodes.jsx'
import AuthenticatorQr from './AuthenticatorQr.jsx'
import CodeInput from './CodeInput.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const longDate = (value) => new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

/**
 * In Settings, for everyone: whether two-step sign-in is on, and what can be done about it.
 *
 * Administrators must have it on. For them the card offers new recovery codes and moving it to a new
 * phone. Everyone else can choose to switch it on (it opens the same setup page administrators are sent
 * to), and once it is on can also switch it off. Every one of these needs a current code from the app, so
 * a stolen sign-in alone cannot change it.
 */
export default function SecurityCard() {
  const { refetch } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [dialog, setDialog] = useState(null) // 'codes' | 'phone' | 'off'
  const [step, setStep] = useState('code') // for 'phone': 'code' (old app) -> 'scan' (new app) -> 'done'
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [codes, setCodes] = useState(null)
  const [newSetup, setNewSetup] = useState(null)

  const load = () => api.get('/me/mfa').then((res) => setStatus(res.data)).catch(() => setStatus(null))
  useEffect(() => {
    load()
  }, [])

  const open = (which) => {
    setDialog(which)
    setStep('code')
    setCode('')
    setError('')
    setCodes(null)
    setNewSetup(null)
  }

  const close = () => {
    setDialog(null)
    setCode('')
    setError('')
    setCodes(null)
    setNewSetup(null)
    load()
  }

  // Runs a request for the open window, showing a wrong code under the boxes.
  const attempt = async (request, onOk, fallback) => {
    setBusy(true)
    setError('')
    try {
      onOk((await request()).data)
    } catch (err) {
      setError(err.response?.data?.errors?.code?.[0] ?? errorMessage(err, fallback))
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const submit = (e) => {
    e.preventDefault()
    const typed = code.trim()
    if (dialog === 'codes') {
      return attempt(() => api.post('/me/mfa/recovery-codes', { code: typed }), (data) => setCodes(data.recovery_codes), 'Could not get new codes.')
    }
    if (dialog === 'off') {
      return attempt(
        () => api.delete('/me/mfa', { data: { code: typed } }),
        async () => {
          await refetch()
          close()
        },
        'Could not switch it off.',
      )
    }
    if (step === 'code') {
      return attempt(
        () => api.post('/me/mfa/replace', { code: typed }),
        (data) => {
          setNewSetup(data)
          setStep('scan')
          setCode('')
        },
        'Could not start moving to a new phone.',
      )
    }
    return attempt(
      () => api.post('/me/mfa/replace/confirm', { code: typed }),
      (data) => {
        setCodes(data.recovery_codes)
        setStep('done')
        setCode('')
      },
      'Could not check that code.',
    )
  }

  if (!status) return null
  const low = status.enabled && status.recovery_codes_left <= 2

  // ---- Not on: only people for whom it is optional get here (administrators are sent to set it up).
  if (!status.enabled) {
    return (
      <Card data-tour="settings-security">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldOff className="size-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            Two-step sign-in
          </CardTitle>
          <CardDescription>
            Off. Turn it on for extra protection: signing in then needs a 6-digit code from an authenticator app on your phone as well as your
            password. It is your choice, and you can switch it off again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="gap-2" onClick={() => navigate('/security/mfa')}>
            <ShieldCheck className="size-4" aria-hidden="true" />
            Set up two-step sign-in
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ---- The window that is open, if any
  const titles = { codes: 'New recovery codes', phone: 'Set up on a new phone', off: 'Turn off two-step sign-in' }
  const descriptions = {
    codes: codes ? 'The old codes no longer work.' : 'Type the current code from your authenticator app to continue.',
    off: 'Type the current code from your authenticator app. Signing in will then only need your password.',
    phone:
      step === 'code'
        ? 'First, type the current code from the app on your old phone.'
        : step === 'scan'
          ? 'Add SWIFT to the app on your new phone, then type the code it shows.'
          : 'Your new phone is set up. The old one no longer works.',
  }
  const finished = dialog === 'codes' ? !!codes : step === 'done'
  const submitLabel = dialog === 'codes' ? 'Get new codes' : dialog === 'off' ? 'Turn off' : step === 'code' ? 'Continue' : 'Finish'

  return (
    <>
      <Card data-tour="settings-security">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-green-700 dark:text-green-400" aria-hidden="true" />
            Two-step sign-in
          </CardTitle>
          <CardDescription>
            On{status.enabled_at ? ` since ${longDate(status.enabled_at)}` : ''}.
            Signing in needs a 6-digit code from your authenticator app as well as your password.
            {status.required ? ' It is required for administrators.' : ''}
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
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => open('codes')}>Get new recovery codes</Button>
            <Button type="button" variant="outline" className="gap-2" onClick={() => open('phone')}>
              <Smartphone className="size-4" aria-hidden="true" />
              Set up on a new phone
            </Button>
            {!status.required && (
              <Button type="button" variant="outline" className="gap-2 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950" onClick={() => open('off')}>
                <ShieldOff className="size-4" aria-hidden="true" />
                Turn off
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={!!dialog}
        onClose={close}
        title={titles[dialog] ?? ''}
        description={descriptions[dialog] ?? ''}
        size="md"
        footer={() => (
          <div className="flex justify-end gap-3">
            {dialog === 'off' && !finished ? (
              // Switching protection off: the risky button is the plain one, the safe way out the filled one.
              <>
                <Button type="submit" form="security-form" variant="outline" disabled={busy || code.trim().length < 6} className="border-red-300 bg-transparent text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
                  {busy ? 'Checking...' : submitLabel}
                </Button>
                <Button type="button" onClick={close}>Cancel</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={close}>{finished ? 'Done' : 'Cancel'}</Button>
                {!finished && (
                  <Button type="submit" form="security-form" disabled={busy || code.trim().length < 6}>
                    {busy ? 'Checking...' : submitLabel}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      >
        {finished ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">Keep these somewhere safe. <strong>They are shown only now.</strong></p>
            <RecoveryCodes codes={codes} />
          </div>
        ) : (
          <form id="security-form" onSubmit={submit} noValidate className="space-y-4">
            {dialog === 'phone' && step === 'scan' && <AuthenticatorQr setup={newSetup} />}
            <FormField id="security-code" label={dialog === 'phone' && step === 'scan' ? 'Code from the new phone' : '6-digit code'} error={error}>
              <CodeInput key={`${dialog}-${step}`} value={code} onChange={(v) => { setCode(v); setError('') }} autoFocus />
            </FormField>
          </form>
        )}
      </Modal>
    </>
  )
}
