import { useEffect, useState } from 'react'
import api from '../api/axios'
import { errorMessage } from '../utils/errors'
import FormField from './FormField.jsx'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import CodeInput from './CodeInput.jsx'

/**
 * The second step of signing in for administrators: the 6-digit code from their authenticator
 * app, or one of their single-use recovery codes if the phone is lost.
 */
export default function MfaStep({ challenge, onDone, onBack }) {
  const [code, setCode] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!lockedUntil) return undefined
    const t = setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= lockedUntil) setLockedUntil(null)
    }, 1000)
    return () => clearInterval(t)
  }, [lockedUntil])

  const locked = lockedUntil !== null && now < lockedUntil

  const submit = async (e) => {
    e.preventDefault()
    if (locked || !code.trim()) return
    setBusy(true)
    setError('')
    try {
      const res = await api.post('/login/mfa', { mfa_token: challenge, code: code.trim() })
      onDone(res.data)
    } catch (err) {
      const data = err.response?.data
      if (data?.expired) {
        onBack('That sign-in expired. Please enter your password again.')
        return
      }
      if (err.response?.status === 429) {
        const seconds = Math.ceil(Number(data?.retry_after) || 60)
        setLockedUntil(Date.now() + seconds * 1000)
        setNow(Date.now())
        setError(data?.message ?? 'Too many wrong codes. Please wait.')
      } else {
        setError(
          typeof data?.attempts_left === 'number' && data.attempts_left <= 2
            ? `${data.message} ${data.attempts_left} ${data.attempts_left === 1 ? 'try' : 'tries'} left.`
            : errorMessage(err, 'Could not check that code.'),
        )
      }
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const secondsLeft = locked ? Math.ceil((lockedUntil - now) / 1000) : 0

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Two-step sign-in</h1>
      <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
        {recovery
          ? 'Type one of your recovery codes. Each one works only once.'
          : 'Open your authenticator app and type the 6-digit code it shows for SWIFT.'}
      </p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <FormField id="mfa-code" label={recovery ? 'Recovery code' : '6-digit code'} error={error}>
          {recovery ? (
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              autoFocus
              maxLength={12}
              placeholder="XXXX-XXXX"
              className="h-12 text-center font-mono text-xl tracking-[0.3em]"
            />
          ) : (
            <CodeInput value={code} onChange={setCode} autoFocus disabled={busy || locked} />
          )}
        </FormField>
        <Button type="submit" disabled={busy || locked || !code.trim()} className="h-11 w-full text-base">
          {busy ? 'Checking...' : locked ? `Try again in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : 'Continue'}
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <button type="button" onClick={() => { setRecovery((r) => !r); setCode(''); setError('') }} className="text-left font-medium text-primary hover:underline dark:text-blue-300">
          {recovery ? 'Use the code from my authenticator app' : 'I lost my phone: use a recovery code'}
        </button>
        <button type="button" onClick={() => onBack('')} className="text-left text-gray-600 hover:underline dark:text-gray-400">
          Back to sign in
        </button>
      </div>
    </div>
  )
}
