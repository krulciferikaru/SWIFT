import { useState } from 'react'
import { MonitorX } from 'lucide-react'
import api from '../api/axios'
import { errorMessage } from '../utils/errors'
import ConfirmAction from './ConfirmAction.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * In Settings, for everyone: sign out of every other place you are signed in, and stay signed in here.
 * For a lost phone or computer, a password someone may have seen, or an account that may have been taken over.
 */
export default function SessionsCard({ showToast }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const endOthers = async () => {
    setBusy(true)
    try {
      const res = await api.post('/me/sessions/end-others')
      showToast(res.data.message)
      setOpen(false)
    } catch (err) {
      showToast(errorMessage(err, 'Could not sign you out of the other places.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card data-tour="settings-sessions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MonitorX className="size-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            Signed-in devices
          </CardTitle>
          <CardDescription>
            Lost a phone or computer, or think someone else may have your password? Sign out of every other place you are signed in. You stay
            signed in here. If you think your account was taken over, also change your password from the sign-in page (Forgot password).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
            <MonitorX className="size-4" aria-hidden="true" />
            Sign out of all other devices
          </Button>
        </CardContent>
      </Card>

      <ConfirmAction
        open={open}
        onOpenChange={setOpen}
        title="Sign out of all other devices?"
        description="Anyone using your account on another phone or computer is signed out at once and has to sign in again. You stay signed in on this one."
        confirmLabel="Sign them out"
        busyLabel="Signing out..."
        busy={busy}
        onConfirm={endOthers}
      />
    </>
  )
}
