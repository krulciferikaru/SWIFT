import { useCallback, useEffect, useState } from 'react'
import { Laptop, MonitorX, Smartphone } from 'lucide-react'
import api from '../api/axios'
import { errorMessage } from '../utils/errors'
import ConfirmAction from './ConfirmAction.jsx'
import { LoadingStatus } from './Skeletons.jsx'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const when = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'unknown'

const isPhone = (device) => /iPhone|iPad|Android/i.test(device)

/**
 * In Settings, for everyone: the places you are signed in (a device name, a hidden network address, when you
 * signed in and when it was last used), with a button to end one of them or all the others. For a lost phone or
 * computer, a password someone may have seen, or an account that may have been taken over.
 */
export default function SessionsCard({ showToast }) {
  const [sessions, setSessions] = useState(null)
  const [failed, setFailed] = useState(false)
  const [ending, setEnding] = useState(null) // one row being ended
  const [endingAll, setEndingAll] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setFailed(false)
    return api
      .get('/me/sessions')
      .then((res) => setSessions(res.data.data))
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const run = async (request, close) => {
    setBusy(true)
    try {
      const res = await request()
      showToast(res.data.message)
      close()
      await load()
    } catch (err) {
      showToast(errorMessage(err, 'Could not sign you out.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const others = (sessions ?? []).filter((s) => !s.is_current)

  return (
    <>
      <Card data-tour="settings-sessions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MonitorX className="size-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            Signed-in devices
          </CardTitle>
          <CardDescription>
            Where you are signed in right now. Don&apos;t recognise one, or lost a phone or computer? Sign it out. If you think someone has your password, also
            change it from the sign-in page (Forgot password). We keep this only while a sign-in is open, and show just part of the network address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions === null && !failed ? (
            <LoadingStatus contentClassName="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </LoadingStatus>
          ) : failed ? (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">Could not load your devices. Try again later.</p>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
              {sessions.map((s) => {
                const Icon = isPhone(s.device) ? Smartphone : Laptop
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Icon className="mt-0.5 size-5 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {s.device}
                          {s.is_current && <Badge variant="outline" className="border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">This device</Badge>}
                          {s.kept_signed_in && <Badge variant="outline" className="font-normal">Kept signed in</Badge>}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {s.network ? `Network ${s.network} · ` : ''}Signed in {when(s.signed_in_at)} · Last used {when(s.last_used_at ?? s.signed_in_at)}
                        </p>
                      </div>
                    </div>
                    {!s.is_current && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setEnding(s)} aria-label={`Sign out ${s.device}`}>
                        Sign out
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {others.length > 1 && (
            <Button type="button" variant="outline" className="gap-2" onClick={() => setEndingAll(true)}>
              <MonitorX className="size-4" aria-hidden="true" />
              Sign out of all other devices
            </Button>
          )}
        </CardContent>
      </Card>

      <ConfirmAction
        open={!!ending}
        onOpenChange={(open) => { if (!open) setEnding(null) }}
        title="Sign out this device?"
        description={ending && <>Whoever is using <strong>{ending.device}</strong> is signed out at once and has to sign in again.</>}
        confirmLabel="Sign it out"
        busyLabel="Signing out..."
        busy={busy}
        onConfirm={() => run(() => api.delete(`/me/sessions/${ending.id}`), () => setEnding(null))}
      />

      <ConfirmAction
        open={endingAll}
        onOpenChange={setEndingAll}
        title="Sign out of all other devices?"
        description="Anyone using your account on another phone or computer is signed out at once and has to sign in again. You stay signed in on this one."
        confirmLabel="Sign them out"
        busyLabel="Signing out..."
        busy={busy}
        onConfirm={() => run(() => api.post('/me/sessions/end-others'), () => setEndingAll(false))}
      />
    </>
  )
}
