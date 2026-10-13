import { useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/errors'
import { firstError, required, mobileNumber } from '../utils/validators'
import FormField from './FormField.jsx'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/**
 * Lets a staff member add or change their own mobile number. Nobody at the office can reset another
 * person's password, so this number (once verified with a texted code) is how a staff member gets
 * back in if they forget theirs. Subscribers' numbers belong to their subscriber record and are
 * changed by staff, so this is not shown to them.
 */
export default function StaffMobileNumber() {
  const { user, refetch } = useAuth()
  const [editing, setEditing] = useState(!user?.contact_number)
  const [value, setValue] = useState(user?.contact_number ?? '')
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState('')

  const localError = firstError(value, required('Mobile number'), mobileNumber)
  const error = serverError || (touched ? localError : '')

  const save = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (localError) return
    setBusy(true)
    setServerError('')
    try {
      const res = await api.patch('/me/mobile-number', { contact_number: value.trim() })
      setSaved(res.data.message)
      setEditing(false)
      await refetch()
    } catch (err) {
      setServerError(err.response?.data?.errors?.contact_number?.[0] ?? errorMessage(err, 'Could not save the number.'))
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Your number: </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{user.contact_number}</span>
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(true); setSaved('') }}>
            Change number
          </Button>
        </div>
        {saved && <p role="status" className="text-sm text-green-700 dark:text-green-400">{saved}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={save} noValidate className="space-y-3">
      <FormField
        id="staff-mobile"
        label="Mobile number"
        hint="Used to text you a code if you forget your password. Nobody at the office can reset it for you."
        error={error}
      >
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(e) => { setValue(e.target.value); setServerError('') }}
          onBlur={() => setTouched(true)}
          placeholder="0917 123 4567"
        />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save number'}</Button>
        {user?.contact_number && (
          <Button type="button" variant="outline" onClick={() => { setEditing(false); setValue(user.contact_number) }}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
