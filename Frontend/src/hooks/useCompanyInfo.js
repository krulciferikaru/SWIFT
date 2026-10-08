import { useCallback, useEffect, useState } from 'react'
import api from '../api/axios'

export const COMPANY_FIELDS = ['phone', 'mobile', 'email', 'address', 'office_hours', 'how_to_pay']

// One copy shared by every component that shows the company's contact details.
let cached = null
let inflight = null

function fetchCompanyInfo(force = false) {
  if (cached && !force) return Promise.resolve(cached)
  inflight ??= api
    .get('/company-info')
    .then((res) => (cached = res.data.data))
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** The company's contact details, entered by an admin. Fields are null until filled in. */
export function useCompanyInfo() {
  const [info, setInfo] = useState(cached)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    let alive = true
    fetchCompanyInfo()
      .then((data) => alive && setInfo(data))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const update = useCallback((data) => {
    cached = data
    setInfo(data)
  }, [])

  const hasAny = !!info && COMPANY_FIELDS.some((f) => info[f])
  return { info, loading, hasAny, update }
}
