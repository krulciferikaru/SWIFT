import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import FormField from './FormField.jsx'
import CodeInput from './CodeInput.jsx'
import { errorMessage } from '../utils/errors'
import { Button } from '@/components/ui/button'

const SOFT = 'border-red-300 bg-transparent text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950'

/**
 * "Prove it is you" for the most powerful admin actions: a current 6-digit code from the person's own authenticator
 * app, on top of the password (which the "Confirm your password" window asks for by itself when it is needed).
 *
 *   <StepUpDialog
 *     open={!!target}
 *     onClose={() => setTarget(null)}
 *     title="Reset two-step sign-in?"
 *     description="..."
 *     confirmLabel="Reset"
 *     risky
 *     onConfirm={async (code) => { await api...(code) }}   // throw to show the error under the boxes
 *   />
 *
 * `risky` puts the plain red button first and the filled "Cancel" last, like the other sensitive confirmations.
 */
export default function StepUpDialog({ open, onClose, title, description, confirmLabel = 'Confirm', risky = false, needCode = true, onConfirm }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setCode('')
      setError('')
    }
  }, [open])

  const submit = async (e) => {
    e?.preventDefault()
    if ((needCode && code.length < 6) || busy) return
    setBusy(true)
    setError('')
    try {
      await onConfirm(needCode ? code : '')
    } catch (err) {
      setError(err.response?.data?.errors?.code?.[0] ?? errorMessage(err, 'Could not do that.'))
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const confirmButton = (
    <Button
      type="submit"
      form="step-up-form"
      variant={risky ? 'outline' : 'default'}
      className={risky ? SOFT : undefined}
      disabled={busy || (needCode && code.length < 6)}
    >
      {busy ? 'Checking...' : confirmLabel}
    </Button>
  )
  const cancelButton = (
    <Button type="button" variant={risky ? 'default' : 'outline'} onClick={onClose} disabled={busy}>Cancel</Button>
  )

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      description={description}
      size="md"
      footer={() => (
        <div className="flex justify-end gap-3">
          {risky ? <>{confirmButton}{cancelButton}</> : <>{cancelButton}{confirmButton}</>}
        </div>
      )}
    >
      <form id="step-up-form" onSubmit={submit} noValidate className="space-y-3">
        {needCode ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This needs a current code from <strong>your</strong> authenticator app, as well as your password.
            </p>
            <FormField id="step-up-code" label="6-digit code" error={error}>
              <CodeInput value={code} onChange={(v) => { setCode(v); setError('') }} autoFocus />
            </FormField>
          </>
        ) : (
          error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>
        )}
      </form>
    </Modal>
  )
}
