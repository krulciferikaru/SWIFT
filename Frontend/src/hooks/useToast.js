import { useState } from 'react'

/**
 * Simple toast notification hook.
 * Returns { toast, showToast } — toast is null when nothing is showing.
 */
export function useToast() {
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  return { toast, showToast }
}