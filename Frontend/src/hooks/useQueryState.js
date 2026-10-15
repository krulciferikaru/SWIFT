import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Keeps a page's search, filters, sort and page number in the web address, so refreshing the page,
 * pressing Back, or sharing the link brings back the same view.
 *
 *   const DEFAULTS = { q: '', status: 'All', page: 1 }          // keep this outside the component
 *   const [view, setView] = useQueryState(DEFAULTS)
 *   view.status                                                 // 'All', or the value in the address
 *   setView({ status: 'Unpaid', page: 1 })                      // change one or more
 *
 * A value equal to its default is left out of the address, so the plain page has a plain link.
 * A number default gives a number back. The address is replaced, not added to, so each keystroke
 * or click does not add a step to the Back button.
 */
export function useQueryState(defaults) {
  const [params, setParams] = useSearchParams()

  const view = useMemo(() => {
    const out = {}
    for (const [key, fallback] of Object.entries(defaults)) {
      const raw = params.get(key)
      if (raw === null) out[key] = fallback
      else if (typeof fallback === 'number') {
        const n = Number(raw)
        out[key] = Number.isFinite(n) && n > 0 ? n : fallback
      } else out[key] = raw
    }
    return out
    // defaults is a constant owned by the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const setView = useCallback(
    (patch) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === '' || value === null || value === undefined || String(value) === String(defaults[key])) {
              next.delete(key)
            } else {
              next.set(key, String(value))
            }
          }
          return next
        },
        { replace: true },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  )

  return [view, setView]
}
