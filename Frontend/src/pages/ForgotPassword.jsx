import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import api from '../api/axios'
import { errorMessage } from '../utils/errors'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordField from '../components/PasswordField.jsx'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import CodeInput from '../components/CodeInput.jsx'

/**
 * Forgot password, in two steps: ask for a code by text message, then type the code and a new
 * password. What the page says never depends on whether the number belongs to an account.
 */
export default function ForgotPassword() {
  useEffect(() => {
    document.title = 'Reset password · SWIFT'
  }, [])

  const [step, setStep] = useState('ask') // ask | reset | done
  const [login, setLogin] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const requestCode = async (e) => {
    e?.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await api.post('/password/forgot', { login: login.trim() })
      setInfo(res.data.message)
      setStep('reset')
      setWait(60)
    } catch (err) {
      setError(
        err.response?.status === 429
          ? 'Too many requests. Please wait a few minutes and try again.'
          : errorMessage(err, 'Something went wrong. Please try again.'),
      )
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setErrors({})
    try {
      await api.post('/password/reset', {
        login: login.trim(),
        code,
        password,
        password_confirmation: confirm,
      })
      setStep('done')
    } catch (err) {
      if (err.response?.status === 422 && err.response.data?.errors) {
        setErrors(err.response.data.errors)
      } else {
        setError(
          err.response?.status === 429
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : errorMessage(err, 'Could not reset the password. Please try again.'),
        )
      }
    } finally {
      setBusy(false)
    }
  }

  const fieldError = (key) =>
    errors[key] && (
      <p id={`${key}-error`} role="alert" className="text-sm text-red-700 dark:text-red-400">{errors[key][0]}</p>
    )

  return (
    <AuthLayout>
      {step !== 'done' && (
        <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to sign in
        </Link>
      )}

      {step === 'ask' && (
        <>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Forgot your password?</h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Enter the mobile number on your account. We will text you a 6-digit code to set a new password.
          </p>
          {error && (
            <div role="alert" className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>
          )}
          <form onSubmit={requestCode} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login">Mobile number</Label>
              <Input id="login" type="tel" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="09XX-XXX-XXXX" autoComplete="tel" required autoFocus className="h-11" />
            </div>
            <Button type="submit" disabled={busy || login.trim().length < 7} className="h-11 w-full text-base">
              {busy ? 'Sending...' : 'Send me a code'}
            </Button>
          </form>
          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <p className="font-medium text-gray-900 dark:text-gray-100">This only works if your mobile number is verified.</p>
            <p className="mt-1">
              Nobody at the office can see or reset a password for you, so the number has to be verified before you need it: sign in, then open Settings and verify your mobile number. Staff add their number there too.
            </p>
          </div>
        </>
      )}

      {step === 'reset' && (
        <>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Set a new password</h1>
          <p role="status" className="mt-2 text-base text-gray-600 dark:text-gray-400">{info}</p>
          {error && (
            <div role="alert" className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>
          )}
          <form onSubmit={resetPassword} className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <CodeInput
                id="code" value={code} onChange={setCode} autoFocus
                aria-invalid={errors.code ? true : undefined} aria-describedby={errors.code ? 'code-error' : undefined}
              />
              {fieldError('code')}
              <button
                type="button" onClick={requestCode} disabled={busy || wait > 0}
                className="text-sm font-medium text-primary hover:underline disabled:text-gray-500 disabled:no-underline dark:disabled:text-gray-400"
              >
                {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordField
                id="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password" required className="h-11"
                aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? 'password-error' : 'password-hint'}
              />
              <p id="password-hint" className="text-xs text-gray-600 dark:text-gray-400">At least 8 characters.</p>
              {fieldError('password')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <PasswordField id="confirm-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required className="h-11" />
            </div>
            <Button type="submit" disabled={busy || code.length !== 6 || password.length < 8} className="h-11 w-full text-base">
              {busy ? 'Saving...' : 'Change password'}
            </Button>
          </form>
        </>
      )}

      {step === 'done' && (
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto size-14 text-green-700 dark:text-green-400" aria-hidden="true" />
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Password changed</h1>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Your password has been changed and you have been signed out of every device. Sign in with your new password.
          </p>
          <Link to="/login" className={cn(buttonVariants(), 'h-11 w-full text-base')}>Go to sign in</Link>
        </div>
      )}
    </AuthLayout>
  )
}
