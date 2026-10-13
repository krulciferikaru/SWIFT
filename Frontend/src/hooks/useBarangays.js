import { useCallback, useEffect, useState } from 'react'
import barangaysApi from '../api/barangays'

// Shared by the registration form and the subscriber form, so the list is fetched once.
let cached = null
const listeners = new Set()

export function refreshBarangays() {
  return barangaysApi.getActive().then((res) => {
    cached = res.data.data
    listeners.forEach((fn) => fn(cached))
    return cached
  })
}

/** The addresses an admin has switched on, in order, like "Malete, Palayan City". */
export function useBarangays() {
  const [barangays, setBarangays] = useState(cached ?? [])
  const [loading, setLoading] = useState(!cached)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    setFailed(false)
    refreshBarangays()
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    listeners.add(setBarangays)
    if (!cached) load()
    return () => listeners.delete(setBarangays)
  }, [load])

  return { barangays, loading, failed, reload: load }
}
