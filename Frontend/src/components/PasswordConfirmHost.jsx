import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { registerPasswordConfirmHandler } from '../utils/passwordConfirm'
import { errorMessage } from '../utils/errors'
import Modal from './Modal'
import PasswordField from './PasswordField.jsx'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

/**
 * The "Confirm your password" window. Mounted once for the whole app; it opens whenever the server
 * asks for the password again before a sensitive action (changing permissions, resetting a
 * password, deleting for good). It stays valid for 10 minutes.
 */
export default function PasswordConfirmHost() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(null) // resolve() of the request waiting on this window

  const ask = useCallback(
    () =>
      new Promise((resolve) => {
        // If one is already open, the new request just waits for the same answer.
        const previous = pending.current
        pending.current = (ok) => {
          previous?.(ok)
          resolve(ok)
        }
        setPassword('')
        setError('')
        setOpen(true)
      }),
    [],
  )

  useEffect(() => registerPasswordConfirmHandler(ask), [ask])

  const finish = (ok) => {
    setOpen(false)
    setPassword('')
    pending.current?.(ok)
    pending.current = null
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.post('/me/confirm-password', { password })
      finish(true)
    } catch (err) {
      setError(errorMessage(err, 'Could not confirm your password. Please try again.'))
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => finish(false)}
      title="Confirm your password"
      description="For your security, enter your password to continue. You will not be asked again for 10 minutes."
      size="sm"
      footer={() => (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => finish(false)}>
            Cancel
          </Button>
          <Button type="submit" form="confirm-password-form" disabled={busy || password.length === 0}>
            {busy ? 'Checking...' : 'Confirm'}
          </Button>
        </div>
      )}
    >
      <form id="confirm-password-form" onSubmit={submit} className="space-y-3">
        {error && (
          <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Your password</Label>
          <PasswordField
            id="confirm-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
        </div>
      </form>
    </Modal>
  )
}
