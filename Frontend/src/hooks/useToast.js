import { useCallback, useEffect, useRef, useState } from 'react'

const SUCCESS_MS = 5000
const WITH_ACTION_MS = 9000 // long enough to reach for an Undo button
const RESUME_MS = 3000 // what is left once the pointer moves away

/**
 * Toast notification hook. Returns { toast, showToast } — toast is null when nothing is showing.
 *
 *   showToast('Saved')                                   // goes away by itself after 5 seconds
 *   showToast('Could not save', 'error')                 // stays until dismissed
 *   showToast('Archived', 'success', { action: { label: 'Undo', onClick } })   // stays 9 seconds
 *
 * Errors do not disappear on their own: a message about something that failed has to be read.
 * Pointing at a toast (or tabbing into it) pauses the countdown.
 */
export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const clear = () => {
    clearTimeout(timer.current)
    timer.current = null
  }

  const dismiss = useCallback(() => {
    clear()
    setToast(null)
  }, [])

  useEffect(() => clear, [])

  const showToast = (message, type = 'success', options = {}) => {
    clear()
    const action = options.action ?? null
    const duration = options.duration ?? (type === 'error' ? null : action ? WITH_ACTION_MS : SUCCESS_MS)
    const start = (ms) => {
      clear()
      if (ms) timer.current = setTimeout(() => setToast(null), ms)
    }
    setToast({
      message,
      type,
      action,
      dismiss,
      pause: clear,
      resume: () => start(duration ? RESUME_MS : null),
    })
    start(duration)
  }

  return { toast, showToast, dismissToast: dismiss }
}
