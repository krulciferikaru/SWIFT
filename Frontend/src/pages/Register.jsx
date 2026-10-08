import { useState } from 'react'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/errors'
import CompanyContact from '../components/CompanyContact.jsx'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import api from '../api/axios'
import { capitalizeWords, BARANGAYS } from '../utils/text'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Register() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    contact_number: '',
    address: '',
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    const nameFields = ['first_name', 'last_name']
    setForm({ ...form, [name]: nameFields.includes(name) ? capitalizeWords(value) : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setMessage('')
    setLoading(true)

    try {
      const payload = new URLSearchParams(form).toString()
      const response = await api.post('/register', payload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      setMessage(response.data.message)
      setSubmitted(true)
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors)
      } else {
        setMessage(errorMessage(err, 'Registration failed. Please try again.'))
      }
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <CheckCircle2 className="size-12 text-green-700 dark:text-green-400 mx-auto" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Registration submitted</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {message || 'Your registration is awaiting approval from our staff.'}
              </p>
            </div>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-1">
          <div aria-hidden="true" className="text-2xl font-bold text-primary mb-2">SWIFT</div>
          <CardTitle as="h1">Create your account</CardTitle>
          <CardDescription>Register for cable TV service. Your application will be reviewed before activation.</CardDescription>
        </CardHeader>
        <CardContent>
          {message && !submitted && (
            <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  className={errors.first_name ? 'border-red-400' : ''}
                />
                {errors.first_name && <p className="text-red-500 text-xs">{errors.first_name[0]}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                  className={errors.last_name ? 'border-red-400' : ''}
                />
                {errors.last_name && <p className="text-red-500 text-xs">{errors.last_name[0]}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact_number">Contact Number</Label>
              <Input
                id="contact_number"
                name="contact_number"
                value={form.contact_number}
                onChange={handleChange}
                placeholder="09XX-XXX-XXXX"
                required
                className={errors.contact_number ? 'border-red-400' : ''}
              />
              {errors.contact_number && <p className="text-red-500 text-xs">{errors.contact_number[0]}</p>}
              <p className="text-xs text-gray-500 dark:text-gray-400">You will use this number to log in.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email <span className="text-gray-500 dark:text-gray-400 font-normal">(optional)</span></Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={errors.email ? 'border-red-400' : ''}
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <select
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                required
                className={`h-9 w-full rounded-md border bg-transparent px-3 text-sm dark:bg-gray-950 ${errors.address ? 'border-red-400' : 'border-input'}`}
              >
                <option value="">Select your barangay</option>
                {BARANGAYS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              {errors.address && <p className="text-red-500 text-xs">{errors.address[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className={`pr-10 ${errors.password ? 'border-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs">{errors.password[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password_confirmation">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="password_confirmation"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="password_confirmation"
                  value={form.password_confirmation}
                  onChange={handleChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Registering...' : 'Register'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-center text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log In
            </Link>
          </p>
          <CompanyContact variant="inline" />
        </CardContent>
      </Card>
    </main>
  )
}