import { useState, useEffect, useCallback } from 'react'
import subscriberApi from '../api/subscribers'

/**
 * Handles fetching subscribers (paginated + filtered) and the summary stats.
 * Consumers control search/status/page; this hook just reacts to them.
 */
export function useSubscribers({ search, status, page }) {
  const [subscribers, setSubscribers] = useState([])
  const [meta, setMeta] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSubscribers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cacheBuster = Date.now()
      const params = { page, per_page: 15, _: cacheBuster }
      if (search) params.search = search
      if (status !== 'All') params.status = status

      const res = await subscriberApi.getAll(params)
      const responseData = res.data.data

      if (Array.isArray(responseData)) {
        setSubscribers(responseData)
        setMeta(null)
      } else if (responseData?.data) {
        setSubscribers(responseData.data)
        setMeta(responseData)
      } else {
        setSubscribers([])
        setMeta(null)
      }
    } catch {
      setError('Failed to load subscribers. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [search, status, page])

  const fetchSummary = useCallback(async () => {
    try {
      const res = await subscriberApi.getSummary()
      setSummary(res.data.data)
    } catch {
      // Non-critical — summary cards just won't show
    }
  }, [])

  useEffect(() => {
    fetchSubscribers()
  }, [fetchSubscribers])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return { subscribers, meta, summary, loading, error, refetch: fetchSubscribers, refetchSummary: fetchSummary }
}