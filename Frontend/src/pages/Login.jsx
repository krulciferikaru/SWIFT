import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronDown, LifeBuoy } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/errors'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordField from '../components/PasswordField.jsx'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const formatCountdown = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Login() {
  useEffect(() => {
    document.title = 'Sign in · SWIFT'
  }, [])

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [lockedUntil, setLockedUntil] = useState(null) // time (ms) sign-in is paused until
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const passwordRef = useRef(null)
  const navigate = useNavigate()
  const { login, isAuthenticated, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate])

  // Count down while sign-in is paused, then let the person try again.
  useEffect(() => {
    if (!lockedUntil) return
    const tick = () => {
      const left = Math.max(Math.ceil((lockedUntil - Date.now()) / 1000), 0)
      setSecondsLeft(left)
      if (left === 0) {
        setLockedUntil(null)
        setError('')
      }
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [lockedUntil])

  const locked = lockedUntil !== null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (locked) return
    setError('')
    setWarning('')
    setLoading(true)

    try {
      const payload = new URLSearchParams({
        login: identifier.trim(),
        password,
        remember: remember ? '1' : '0',
      }).toString()
      const response = await api.post('/login', payload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      login(response.data.token, response.data.user, remember)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 429) {
        // Too many wrong passwords for this account, or too many requests at once.
        const header = Number(err.response.headers?.['retry-after'])
        const seconds = Math.ceil(Number(data?.retry_after) || header || 60)
        setError(data?.locked ? data.message : 'Too many attempts. Please wait a moment and try again.')
        setLockedUntil(Date.now() + seconds * 1000)
        setPassword('')
      } else {
        setError(errorMessage(err, 'Login failed. Please try again.'))
        if (err.response?.status === 401) {
          setPassword('')
          if (typeof data?.attempts_left === 'number' && data.attempts_left <= 2) {
            const n = data.attempts_left
            setWarning(
              `${n} ${n === 1 ? 'attempt' : 'attempts'} left. After that, sign-in for this account is paused for 15 minutes.`,
            )
          }
          passwordRef.current?.focus()
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Sign in</h1>
      <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
        Sign in to manage SWIFT billing and subscriber services.
      </p>

      <div className="mt-8 space-y-4" aria-live="polite">
        {error && (
          <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
            {locked && (
              <span aria-hidden="true" className="mt-1 block font-mono text-base font-semibold">
                Try again in {formatCountdown(secondsLeft)}
              </span>
            )}
          </div>
        )}
        {warning && !error.startsWith('Too many') && (
          <div role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {warning}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="login">Contact number or email</Label>
          <Input
            id="login"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="09XX-XXX-XXXX"
            autoComplete="username"
            required
            autoFocus
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordField
            id="password"
            ref={passwordRef}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="h-11"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4"
              aria-describedby="remember-hint"
            />
            <Label htmlFor="remember" className="cursor-pointer font-normal">Keep me signed in</Label>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen((o) => !o)}
            aria-expanded={helpOpen}
            aria-controls="signin-help"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Can't sign in?
            <ChevronDown className={`size-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
        {remember && (
          <p id="remember-hint" className="-mt-2 text-xs text-gray-600 dark:text-gray-400">
            Stays signed in for 30 days on this device. Don't use this on a shared computer.
          </p>
        )}

        {helpOpen && (
          <div id="signin-help" className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
            <p className="mb-2 flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
              <LifeBuoy className="size-4 shrink-0" aria-hidden="true" />
              Trouble signing in?
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Use the mobile number or email you registered with.</li>
              <li>Passwords are case-sensitive. Tap <strong>Show</strong> to check what you typed.</li>
              <li>Forgot your password? Contact the office to have it reset. Staff can ask an administrator.</li>
              <li>After 5 wrong passwords, sign-in for that account pauses for 15 minutes.</li>
              <li>"Awaiting approval" means staff have not approved your registration yet.</li>
            </ul>
          </div>
        )}

        <Button type="submit" disabled={loading || locked} className="h-11 w-full text-base">
          {loading ? 'Signing in...' : locked ? `Try again in ${formatCountdown(secondsLeft)}` : 'Sign in'}
        </Button>
      </form>

      <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
        <p className="mb-3 text-center text-sm text-gray-600 dark:text-gray-400">New to SWIFT?</p>
        <Link to="/register" className={cn(buttonVariants({ variant: 'outline' }), 'h-11 w-full text-base')}>
          Create an account
        </Link>
      </div>
    </AuthLayout>
  )
}
