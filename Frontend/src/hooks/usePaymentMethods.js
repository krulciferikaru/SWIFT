import { useCallback, useEffect, useState } from 'react'
import paymentMethodsApi from '../api/paymentMethods'

// Shared by the payment form and the report filters, so the list is fetched once.
let cached = null
const listeners = new Set()

export function refreshPaymentMethods() {
  return paymentMethodsApi
    .getActive()
    .then((res) => {
      cached = res.data.data.map((m) => m.name)
      listeners.forEach((fn) => fn(cached))
      return cached
    })
}

/** Names of the payment methods an admin has switched on, in order. */
export function usePaymentMethods() {
  const [methods, setMethods] = useState(cached ?? [])
  const [loading, setLoading] = useState(!cached)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    setFailed(false)
    refreshPaymentMethods()
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    listeners.add(setMethods)
    if (!cached) load()
    return () => listeners.delete(setMethods)
  }, [load])

  return { methods, loading, failed, reload: load }
}
