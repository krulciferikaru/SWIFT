import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LifeBuoy } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/errors'
import CompanyContact from '../components/CompanyContact.jsx'
import PasswordField from '../components/PasswordField.jsx'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-1">
          <div aria-hidden="true" className="text-2xl font-bold text-primary">SWIFT</div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Subscriber and Web-based Information and Financial Tracking System
          </p>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Jubal Brothers Cable TV Corp. · Palayan Branch
          </p>
          <CardTitle as="h1" className="pt-3">Sign in</CardTitle>
          <CardDescription>Sign in to manage SWIFT billing and subscriber services.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
              {error}
              {locked && (
                <span aria-hidden="true" className="mt-1 block font-mono text-base font-semibold">
                  Try again in {formatCountdown(secondsLeft)}
                </span>
              )}
            </div>
          )}
          {warning && !error.startsWith('Too many') && (
            <div role="status" className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {warning}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login">Contact Number or Email</Label>
              <Input
                id="login"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="09XX-XXX-XXXX"
                autoComplete="username"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordField
                id="password"
                ref={passwordRef}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="flex items-start gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="mt-0.5 size-4"
              />
              <div>
                <Label htmlFor="remember" className="cursor-pointer font-medium">Keep me signed in</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  For 30 days on this device. Don't use this on a shared computer.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={loading || locked} className="w-full">
              {loading ? 'Signing in...' : locked ? `Try again in ${formatCountdown(secondsLeft)}` : 'Sign In'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-center text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </p>

          <CompanyContact variant="inline" />

          <details className="mt-4 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
            <summary className="flex cursor-pointer items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
              <LifeBuoy className="size-4 shrink-0" aria-hidden="true" />
              Can't sign in?
            </summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-gray-700 dark:text-gray-300">
              <li>Sign in with the mobile number or email you registered with.</li>
              <li>Passwords are case-sensitive. Use <strong>Show</strong> to check what you typed.</li>
              <li>
                Forgot your password? Contact the office to have it reset. Staff can ask an administrator.
              </li>
              <li>After 5 wrong passwords, sign-in for that account pauses for 15 minutes.</li>
              <li>"Awaiting approval" means staff have not approved your registration yet.</li>
            </ul>
          </details>
        </CardContent>
      </Card>
    </main>
  )
}
