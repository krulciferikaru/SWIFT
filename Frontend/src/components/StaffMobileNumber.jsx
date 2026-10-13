import { useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/errors'
import { firstError, required, mobileNumber } from '../utils/validators'
import FormField from './FormField.jsx'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import CodeInput from './CodeInput.jsx'

/**
 * Lets a staff member add or change their own mobile number. Nobody at the office can reset another
 * person's password, so this number (once verified with a texted code) is how a staff member gets
 * back in if they forget theirs. Because it is also a way to take over an account, someone with two-step sign-in
 * has to type a current code from their app (or a recovery code) to change it. Subscribers' numbers belong to their subscriber record and are
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
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const needsCode = Boolean(user?.mfa_enabled)

  const localError = firstError(value, required('Mobile number'), mobileNumber)
  const error = serverError || (touched ? localError : '')

  const save = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (localError) return
    if (needsCode && code.trim().length < (useRecovery ? 8 : 6)) {
      setCodeError('Type the current code from your authenticator app.')
      return
    }
    setBusy(true)
    setServerError('')
    setCodeError('')
    try {
      const res = await api.patch('/me/mobile-number', { contact_number: value.trim(), ...(needsCode ? { code: code.trim() } : {}) })
      setSaved(res.data.message)
      setEditing(false)
      setCode('')
      await refetch()
    } catch (err) {
      const errors = err.response?.data?.errors
      setServerError(errors?.contact_number?.[0] ?? (errors?.code ? '' : errorMessage(err, 'Could not save the number.')))
      if (errors?.code) {
        setCodeError(errors.code[0])
        setCode('')
      }
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
      {needsCode && (
        <div className="space-y-2">
          <FormField
            id="staff-mobile-code"
            label={useRecovery ? 'Recovery code' : 'Code from your authenticator app'}
            hint="Changing your number also needs a current code, because it is how a forgotten password is recovered."
            error={codeError}
          >
            {useRecovery ? (
              <Input
                value={code}
                onChange={(e) => { setCode(e.target.value); setCodeError('') }}
                autoComplete="off"
                maxLength={12}
                placeholder="XXXX-XXXX"
                className="h-11 text-center font-mono text-lg tracking-[0.3em]"
              />
            ) : (
              <CodeInput value={code} onChange={(v) => { setCode(v); setCodeError('') }} />
            )}
          </FormField>
          <button
            type="button"
            onClick={() => { setUseRecovery((r) => !r); setCode(''); setCodeError('') }}
            className="text-sm font-medium text-primary hover:underline dark:text-blue-300"
          >
            {useRecovery ? 'Use the code from my authenticator app' : 'My phone is lost: use a recovery code'}
          </button>
        </div>
      )}
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
