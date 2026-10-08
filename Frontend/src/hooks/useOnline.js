import { useEffect, useRef, useState } from 'react'

/** Whether the browser currently believes it has a connection. */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online
}

/** Runs `callback` each time the connection comes back, e.g. to reload a list that failed. */
export function useOnReconnect(callback) {
  const latest = useRef(callback)
  latest.current = callback

  useEffect(() => {
    const handler = () => latest.current?.()
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [])
}
