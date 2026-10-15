import { useCallback, useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Receipt, UserPlus, PiggyBank } from 'lucide-react'
import api from '../api/axios'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import DateHint from './DateHint.jsx'
import { errorMessage } from '../utils/errors'
import { useOnReconnect } from '../hooks/useOnline'

const PERIODS = [
  ['day', 'Today'],
  ['month', 'This month'],
  ['quarter', 'This quarter'],
  ['year', 'This year'],
  ['all', 'All time'],
  ['custom', 'Custom range'],
]
const STORAGE_KEY = 'swift.dashboardPeriod'
const COMPARE_WORD = {
  day: 'yesterday',
  month: 'last month',
  quarter: 'last quarter',
  year: 'last year',
  custom: 'the days before',
}

const localDate = (d) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const peso = (value) => `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

function storedPeriod() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return PERIODS.some(([key]) => key === value) && value !== 'custom' ? value : 'month'
  } catch {
    return 'month'
  }
}

/** "+12% vs last month" with an arrow, or nothing when there is nothing to compare with. */
function Change({ period, current, previous }) {
  if (period === 'all' || previous === null || previous === undefined) return null
  if (previous === 0) {
    return current > 0 ? <span className="text-xs text-gray-500 dark:text-gray-400">Nothing {COMPARE_WORD[period]}</span> : null
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10
  if (pct === 0) return <span className="text-xs text-gray-500 dark:text-gray-400">Same as {COMPARE_WORD[period]}</span>
  const up = pct > 0
  const Arrow = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
      <Arrow className="size-3.5" aria-hidden="true" />
      {Math.abs(pct)}% vs {COMPARE_WORD[period]}
    </span>
  )
}

/**
 * Activity in a chosen period: money collected, payments recorded, new subscribers.
 * The subscriber status counts elsewhere on the dashboard are "right now" numbers; the system
 * does not keep a history of statuses, so they cannot be filtered by period.
 */
export default function DashboardActivity() {
  const [period, setPeriod] = useState(storedPeriod)
  // The dates being typed, and the dates that were applied (what is actually shown).
  const [draft, setDraft] = useState({ from: '', to: '' })
  const [range, setRange] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (period === 'custom' && !range) return // nothing to show until a range is applied
    setLoading(true)
    setError('')
    try {
      const params = period === 'custom' ? { period, from: range.from, to: range.to } : { period }
      const res = await api.get('/dashboard/period', { params })
      setData(res.data.data)
    } catch (err) {
      setError(errorMessage(err, 'Failed to load activity for this period.'))
    } finally {
      setLoading(false)
    }
  }, [period, range])

  useEffect(() => {
    load()
  }, [load])

  useOnReconnect(load)

  const choose = (key) => {
    setPeriod(key)
    if (key === 'custom') return // the dates are not remembered, so the preset choice stays as it was
    try {
      localStorage.setItem(STORAGE_KEY, key)
    } catch {
      // The choice just will not be remembered.
    }
  }

  const today = localDate(new Date())
  const draftError =
    draft.from && draft.to && draft.to < draft.from
      ? 'The end date is before the start date.'
      : ''
  const applyRange = (e) => {
    e.preventDefault()
    if (!draft.from || !draft.to || draftError) return
    setRange({ ...draft })
  }

  const showMoney = data && data.collected !== null
  const fresh =
    data && data.period === period && (period !== 'custom' || (range && data.from === range.from && data.to === range.to))
  const waitingForRange = period === 'custom' && !range

  return (
    <section data-tour="dash-activity" aria-labelledby="dash-activity-heading" aria-busy={loading || undefined} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dash-activity-heading" className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Activity
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
            {waitingForRange ? 'Pick the dates to look at.' : fresh ? data.label : ' '}
          </p>
        </div>
        <div role="group" aria-label="Show activity for" className="flex flex-wrap gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          {PERIODS.map(([key, text]) => (
            <button
              key={key}
              type="button"
              aria-pressed={period === key}
              onClick={() => choose(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === key
                  ? 'bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3" aria-label="Custom date range">
          <div className="space-y-1">
            <label htmlFor="dash-from" className="block text-xs font-medium text-gray-600 dark:text-gray-400">From</label>
            <Input
              id="dash-from"
              type="date"
              value={draft.from}
              max={draft.to || today}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              required
              className="w-40"
            />
            <DateHint value={draft.from} />
          </div>
          <div className="space-y-1">
            <label htmlFor="dash-to" className="block text-xs font-medium text-gray-600 dark:text-gray-400">To</label>
            <Input
              id="dash-to"
              type="date"
              value={draft.to}
              min={draft.from || undefined}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              required
              className="w-40"
            />
            <DateHint value={draft.to} />
          </div>
          <Button type="submit" disabled={!draft.from || !draft.to || !!draftError}>Show</Button>
          {draftError && <p role="alert" className="w-full text-xs text-red-600 dark:text-red-400">{draftError}</p>}
        </form>
      )}

      {waitingForRange ? null : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
          <button type="button" className="underline" onClick={load}>Try again</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {showMoney !== false && (
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <PiggyBank className="size-5 text-green-700 dark:text-green-400" aria-hidden="true" />
                  {fresh && <Change period={period} current={data.collected} previous={data.previous_collected} />}
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Collected</p>
                {loading || !fresh ? (
                  <Skeleton className="mt-1 h-8 w-32" />
                ) : (
                  <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-400">{peso(data.collected)}</p>
                )}
              </CardContent>
            </Card>
          )}

          {showMoney !== false && (
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <Receipt className="size-5 text-primary" aria-hidden="true" />
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Payments recorded</p>
                {loading || !fresh ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{data.payments_count}</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <UserPlus className="size-5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                {fresh && <Change period={period} current={data.new_subscribers} previous={data.previous_new_subscribers} />}
              </div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">New subscribers</p>
              {loading || !fresh ? (
                <Skeleton className="mt-1 h-8 w-16" />
              ) : (
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{data.new_subscribers}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  )
}
