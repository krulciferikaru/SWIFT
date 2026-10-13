import { useState } from 'react'
import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/errors'
import { useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import PasswordField from '../components/PasswordField.jsx'
import api from '../api/axios'
import { capitalizeWords } from '../utils/text'
import { useBarangays } from '../hooks/useBarangays'
import { Input } from '@/components/ui/input'
import FormField, { RequiredNote } from '../components/FormField.jsx'
import { required, mobileNumber, emailAddress, minLength, matches, firstError } from '../utils/validators'
import { Button } from '@/components/ui/button'
import AuthLayout from '../components/AuthLayout.jsx'

export default function Register() {
  const { barangays: BARANGAYS } = useBarangays()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    contact_number: '',
    address: '',
    accept_terms: false,
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const { isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate])

  // Fields the person has already been in. A field is only checked once they leave it, so nobody
  // is told off for a box they have not reached yet.
  const [touched, setTouched] = useState({})

  const localErrors = {
    first_name: required('First name')(form.first_name),
    last_name: required('Last name')(form.last_name),
    contact_number: firstError(form.contact_number, required('Mobile number'), mobileNumber),
    email: emailAddress(form.email),
    address: required('Barangay')(form.address),
    password: firstError(form.password, required('Password'), minLength('Password', 8)),
    password_confirmation: firstError(
      form.password_confirmation,
      required('Password confirmation'),
      matches(() => form.password, 'The two passwords do not match.'),
    ),
    accept_terms: form.accept_terms ? '' : 'You need to agree to the Terms of Service and Privacy Policy to register.',
  }
  // A message from the server wins until the field is edited; otherwise show our own check.
  const fieldError = (name) => errors[name]?.[0] ?? (touched[name] ? localErrors[name] : '')
  const handleBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }))

  const handleChange = (e) => {
    const { name, value } = e.target
    const nameFields = ['first_name', 'last_name']
    setForm({ ...form, [name]: nameFields.includes(name) ? capitalizeWords(value) : value })
    if (errors[name]) setErrors(({ [name]: _gone, ...rest }) => rest)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const firstBad = Object.keys(localErrors).find((name) => localErrors[name])
    if (firstBad) {
      setTouched(Object.fromEntries(Object.keys(localErrors).map((name) => [name, true])))
      document.getElementById(firstBad)?.focus()
      return
    }
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
      <AuthLayout>
        <div className="space-y-5 text-center">
            <CheckCircle2 className="size-12 text-green-700 dark:text-green-400 mx-auto" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Registration submitted</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {message || 'Your registration is awaiting approval from our staff.'}
              </p>
            </div>
            <Button onClick={() => navigate('/login')} className="h-11 w-full text-base">
              Go to sign in
            </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout wide>
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Create your account</h1>
      <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
        Register for cable TV service. Your application will be reviewed before activation.
      </p>
      <div className="mt-8">
          {message && !submitted && (
            <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <RequiredNote />
            <div className="grid grid-cols-2 gap-3">
              <FormField id="first_name" label="First Name" required error={fieldError('first_name')}>
                <Input name="first_name" value={form.first_name} onChange={handleChange} onBlur={handleBlur} autoComplete="given-name" />
              </FormField>
              <FormField id="last_name" label="Last Name" required error={fieldError('last_name')}>
                <Input name="last_name" value={form.last_name} onChange={handleChange} onBlur={handleBlur} autoComplete="family-name" />
              </FormField>
            </div>

            <FormField
              id="contact_number"
              label="Mobile Number"
              required
              hint="You will use this number to log in."
              error={fieldError('contact_number')}
            >
              <Input
                name="contact_number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.contact_number}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0917 123 4567"
              />
            </FormField>

            <FormField id="email" label="Email" optional error={fieldError('email')}>
              <Input type="email" name="email" value={form.email} onChange={handleChange} onBlur={handleBlur} autoComplete="email" />
            </FormField>

            <FormField id="address" label="Address" required error={fieldError('address')}>
              <select
                name="address"
                value={form.address}
                onChange={handleChange}
                onBlur={handleBlur}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm dark:bg-gray-950"
              >
                <option value="">Select your barangay</option>
                {BARANGAYS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="password" label="Password" required hint="At least 8 characters." error={fieldError('password')}>
              <PasswordField name="password" value={form.password} onChange={handleChange} onBlur={handleBlur} autoComplete="new-password" />
            </FormField>

            <FormField id="password_confirmation" label="Confirm Password" required error={fieldError('password_confirmation')}>
              <PasswordField
                name="password_confirmation"
                value={form.password_confirmation}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="new-password"
              />
            </FormField>

            <div className="space-y-1.5">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="accept_terms"
                  checked={form.accept_terms}
                  onCheckedChange={(checked) => {
                    setForm((f) => ({ ...f, accept_terms: !!checked }))
                    setTouched((t) => ({ ...t, accept_terms: true }))
                    if (errors.accept_terms) setErrors(({ accept_terms: _gone, ...rest }) => rest)
                  }}
                  aria-invalid={fieldError('accept_terms') ? true : undefined}
                  aria-describedby={fieldError('accept_terms') ? 'accept_terms-error' : undefined}
                  className="mt-0.5"
                />
                <label htmlFor="accept_terms" className="text-sm leading-snug text-gray-700 dark:text-gray-300">
                  I have read and agree to the{' '}
                  <Link to="/terms" target="_blank" rel="noopener" className="font-medium text-primary underline underline-offset-2 dark:text-blue-300">Terms of Service</Link>{' '}
                  and the{' '}
                  <Link to="/privacy" target="_blank" rel="noopener" className="font-medium text-primary underline underline-offset-2 dark:text-blue-300">Privacy Policy</Link>
                  <span aria-hidden="true" className="ml-0.5 text-red-500">*</span>
                  <span className="sr-only"> (required)</span>
                </label>
              </div>
              {fieldError('accept_terms') && (
                <p id="accept_terms-error" aria-live="polite" className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400">
                  <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                  <span><span className="font-semibold">Error: </span>{fieldError('accept_terms')}</span>
                </p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="h-11 w-full text-base">
              {loading ? 'Registering...' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}