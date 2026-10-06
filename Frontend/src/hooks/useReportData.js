import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import reportApi from '../api/reports'

const CACHE_MS = 60_000
const DEBOUNCE_MS = 350
const FALLBACK_RETRY_SECONDS = 15

// Remembers recent results per period so flipping back and forth between filters
// does not hit the server again every time. The Reload button always bypasses it.
const cache = new Map()

const keyOf = (params) =>
  JSON.stringify(Object.keys(params).sort().map((k) => [k, params[k]]))

const OFFLINE = {
  kind: 'offline',
  message: "You're offline. Reports need an internet connection, so nothing is shown. They will load again when you are back online.",
}

// One place that turns a failed request into something a person can act on.
export function describeRequestError(err, what = 'load the report') {
  if (!err.response) {
    return {
      kind: 'network',
      message: "Can't reach the server. Check your internet connection and try again.",
    }
  }
  if (err.response.status === 429) {
    const header = Number(err.response.headers?.['retry-after'])
    const retryAfter = Number.isFinite(header) && header > 0 ? Math.ceil(header) : FALLBACK_RETRY_SECONDS
    return {
      kind: 'rate_limit',
      retryAfter,
      message: `Too many requests in a short time. Please wait ${retryAfter} seconds to ${what}.`,
    }
  }
  return {
    kind: 'server',
    message: err.response.data?.message || `Failed to ${what}.`,
  }
}

export function useReportData(params) {
  const [state, setState] = useState({ collections: null, statement: null, loading: true, error: null })
  const [online, setOnline] = useState(() => navigator.onLine)
  const key = keyOf(params)

  const seq = useRef(0)
  const controller = useRef(null)
  const timers = useRef({ debounce: null, retry: null })
  const mounted = useRef(false)

  const cancelPending = useCallback(() => {
    clearTimeout(timers.current.debounce)
    clearTimeout(timers.current.retry)
    controller.current?.abort()
    seq.current += 1
  }, [])

  const fetchNow = useCallback(async (p, k, { force = false } = {}) => {
    clearTimeout(timers.current.retry)
    controller.current?.abort()

    if (!force) {
      const hit = cache.get(k)
      if (hit && Date.now() - hit.at < CACHE_MS) {
        seq.current += 1
        setState({ collections: hit.collections, statement: hit.statement, loading: false, error: null })
        return
      }
    }

    const ctl = new AbortController()
    controller.current = ctl
    const id = ++seq.current
    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const [c, st] = await Promise.all([
        reportApi.getCollections(p, { signal: ctl.signal }),
        reportApi.getFinancialStatement(p, { signal: ctl.signal }),
      ])
      if (id !== seq.current) return
      const collections = c.data.data
      const statement = st.data.data
      cache.set(k, { at: Date.now(), collections, statement })
      setState({ collections, statement, loading: false, error: null })
    } catch (err) {
      if (axios.isCancel(err) || id !== seq.current) return
      const error = describeRequestError(err)
      setState({ collections: null, statement: null, loading: false, error })
      if (error.kind === 'rate_limit') {
        timers.current.retry = setTimeout(() => fetchNow(p, k, { force: true }), error.retryAfter * 1000)
      }
    }
  }, [])

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Load when the period changes. Quick successive changes only load the last one.
  useEffect(() => {
    if (!online) {
      cancelPending()
      setState({ collections: null, statement: null, loading: false, error: OFFLINE })
      return
    }

    const t = timers.current
    clearTimeout(t.debounce)
    const hit = cache.get(key)
    const fresh = hit && Date.now() - hit.at < CACHE_MS
    const delay = fresh || !mounted.current ? 0 : DEBOUNCE_MS
    mounted.current = true

    if (!fresh) setState((s) => ({ ...s, loading: true, error: null }))
    t.debounce = setTimeout(() => fetchNow(params, key), delay)
    return () => clearTimeout(t.debounce)
    // params is rebuilt only when its content changes (see key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, online])

  useEffect(() => cancelPending, [cancelPending])

  const reload = useCallback(() => {
    if (!navigator.onLine) return
    clearTimeout(timers.current.debounce)
    fetchNow(params, key, { force: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fetchNow])

  return { ...state, online, reload }
}
