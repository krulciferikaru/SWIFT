import { useEffect, useRef, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnline'

/**
 * A strip across the top while the connection is down, and a short "back online" note after.
 * It is a polite live region, so screen readers hear the change without being interrupted.
 */
export default function OfflineBanner() {
  const online = useOnlineStatus()
  const wasOffline = useRef(false)
  const [justBack, setJustBack] = useState(false)

  useEffect(() => {
    if (!online) {
      wasOffline.current = true
      setJustBack(false)
      return
    }
    if (!wasOffline.current) return
    wasOffline.current = false
    setJustBack(true)
    const t = setTimeout(() => setJustBack(false), 4000)
    return () => clearTimeout(t)
  }, [online])

  return (
    <div role="status" aria-live="polite" data-slot="offline-banner">
      {!online && (
        <div className="flex items-start gap-2 bg-amber-100 dark:bg-amber-950 mb-4 rounded-md px-4 py-2 text-sm text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900">
          <WifiOff className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            You're offline. You can still read what's on screen, but saving changes needs a connection.
            Anything you've typed stays until you're back online.
          </span>
        </div>
      )}
      {online && justBack && (
        <div className="flex items-center gap-2 bg-green-100 dark:bg-green-950 mb-4 rounded-md px-4 py-2 text-sm text-green-900 dark:text-green-200 border border-green-200 dark:border-green-900">
          <Wifi className="size-4 shrink-0" aria-hidden="true" />
          <span>You're back online.</span>
        </div>
      )}
    </div>
  )
}
