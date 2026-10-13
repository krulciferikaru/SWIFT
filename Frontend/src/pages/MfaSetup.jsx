import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/errors'
import FormField from '../components/FormField.jsx'
import RecoveryCodes from '../components/RecoveryCodes.jsx'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import CodeInput from '../components/CodeInput.jsx'
import AuthenticatorQr from '../components/AuthenticatorQr.jsx'

/**
 * Setting up two-step sign-in. Administrators land here after signing in until it is done, because
 * it is required for them. Everyone else can come here from Settings if they want it (they can leave
 * and switch it off later). Steps: get an authenticator app, scan the QR code (or type the key), type
 * the code the app shows to prove it works, then keep the recovery codes somewhere safe.
 */
export default function MfaSetup() {
  const { user, refetch, logout } = useAuth()
  const navigate = useNavigate()
  const [setup, setSetup] = useState(null) // { secret, uri }
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [codes, setCodes] = useState(null)
  const [saved, setSaved] = useState(false)
  const [loadError, setLoadError] = useState('')
  const asked = useRef(false)

  // Ask the server for a secret once. (It asks for the password first: that window is automatic.)
  useEffect(() => {
    if (asked.current || user?.mfa_enabled) return
    asked.current = true
    api
      .post('/me/mfa/setup')
      .then((res) => setSetup(res.data))
      .catch((err) => setLoadError(errorMessage(err, 'Could not start the setup. Please try again.')))
  }, [user?.mfa_enabled])

  const isAdmin = user?.role === 'admin'

  // Already on (and not just finished setting it up): nothing to do here.
  if (user?.mfa_enabled && !codes) {
    return <Navigate to="/settings" replace />
  }

  const confirm = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api.post('/me/mfa/enable', { code: code.trim() })
      setCodes(res.data.recovery_codes)
    } catch (err) {
      setError(err.response?.data?.errors?.code?.[0] ?? errorMessage(err, 'Could not check that code.'))
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    await refetch()
    navigate(isAdmin ? '/dashboard' : '/settings', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 px-4 py-10 dark:bg-gray-900">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Set up two-step sign-in</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {isAdmin
            ? 'Administrators can see and change everything in SWIFT, so signing in needs a second proof as well as the password: a 6-digit code from an app on your phone. It takes about two minutes, and you only do it once.'
            : 'This adds a second step to signing in: a 6-digit code from an app on your phone, as well as your password. It takes about two minutes. It is your choice, and you can switch it off again in Settings.'}
        </p>

        {!codes ? (
          <ol className="mt-6 space-y-6 text-sm text-gray-700 dark:text-gray-300">
            <li>
              <p className="font-semibold text-gray-900 dark:text-gray-100">1. Install an authenticator app</p>
              <p className="mt-1">Google Authenticator, Microsoft Authenticator or Authy, from your phone&apos;s app store. They are free.</p>
            </li>

            <li>
              <p className="font-semibold text-gray-900 dark:text-gray-100">2. Add SWIFT to the app</p>
              {loadError ? (
                <p role="alert" className="mt-2 text-red-700 dark:text-red-400">{loadError}</p>
              ) : !setup ? (
                <p className="mt-2 text-gray-500">Preparing…</p>
              ) : (
                <div className="mt-2">
                  <AuthenticatorQr setup={setup} />
                </div>
              )}
            </li>

            <li>
              <p className="font-semibold text-gray-900 dark:text-gray-100">3. Type the code the app shows</p>
              <form onSubmit={confirm} noValidate className="mt-3 space-y-3">
                <FormField id="mfa-setup-code" label="6-digit code" error={error}>
                  <CodeInput value={code} onChange={(v) => { setCode(v); setError('') }} disabled={!setup} />
                </FormField>
                <Button type="submit" disabled={busy || !setup || code.trim().length < 6}>{busy ? 'Checking...' : 'Turn on two-step sign-in'}</Button>
              </form>
            </li>
          </ol>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">Two-step sign-in is on.</p>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Keep these recovery codes somewhere safe</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                If you lose your phone, each code lets you sign in once. <strong>They are shown only now.</strong> Nobody at the office can give them back to you.
              </p>
            </div>
            <RecoveryCodes codes={codes} />
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
              <Checkbox checked={saved} onCheckedChange={(v) => setSaved(!!v)} className="mt-0.5" />
              <span>I have saved my recovery codes.</span>
            </label>
            <Button type="button" onClick={finish} disabled={!saved} className="w-full">Continue to SWIFT</Button>
          </div>
        )}

        {!codes && (
          isAdmin ? (
            <button type="button" onClick={async () => { await logout(); navigate('/login', { replace: true }) }} className="mt-8 text-sm text-gray-600 hover:underline dark:text-gray-400">
              Sign out instead
            </button>
          ) : (
            <button type="button" onClick={() => navigate('/settings')} className="mt-8 text-sm text-gray-600 hover:underline dark:text-gray-400">
              Not now, back to Settings
            </button>
          )
        )}
      </div>
    </div>
  )
}
