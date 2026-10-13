import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import paymentsApi from '../api/payments'
import { Skeleton } from '@/components/ui/skeleton'
import StatusBadge from './StatusBadge'

const when = (value) =>
  value
    ? new Date(value).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : ''
const day = (value) =>
  value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''

// A moment in time shown as a local date (the installation date, by contrast, is a plain date).
const momentDay = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''

// What each kind of line means, in plain words.
const SOURCE_TEXT = {
  start: 'This is where the history begins.',
  created: 'Subscriber added.',
  approved: 'Application approved.',
  automatic: 'Worked out automatically from the payments.',
  staff: 'Set by staff.',
  system: 'Updated by the system.',
}

/**
 * A subscriber's service history: when the service was installed and every time the status
 * changed (Active, Unpaid, Disconnected), newest first. Subscribers have the right to see their
 * own, so the same list is shown on their page. Staff also see who made a change.
 *
 * Pass `subscriberId` for staff, or leave it out to load the signed-in subscriber's own.
 */
export default function StatusTimeline({ subscriberId, className = '' }) {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading') // loading | idle | error

  useEffect(() => {
    let cancelled = false
    setState('loading')
    const request = subscriberId ? paymentsApi.getStatusHistory(subscriberId) : paymentsApi.getMyStatusHistory()
    request
      .then((res) => {
        if (cancelled) return
        setData(res.data.data)
        setState('idle')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [subscriberId])

  if (state === 'loading') {
    return (
      <div className={`space-y-2 ${className}`} aria-busy="true">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }
  if (state === 'error' || !data) {
    return <p role="alert" className={`text-sm text-red-700 dark:text-red-400 ${className}`}>The service history could not be loaded.</p>
  }

  return (
    <div className={className}>
      <dl className="mb-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Installed</dt>
          <dd className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">{data.installation_date ? day(data.installation_date) : 'Not recorded'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Current status</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
            <StatusBadge status={data.current_status} />
            {data.current_since && <span className="text-xs font-normal text-gray-500 dark:text-gray-400">since {when(data.current_since)}</span>}
          </dd>
        </div>
      </dl>

      {data.events.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No status changes recorded yet.</p>
      ) : (
        <ol className="space-y-3 border-l-2 border-gray-200 pl-4 dark:border-gray-700" aria-label="Status changes, newest first">
          {data.events.map((event) => (
            <li key={event.id} className="relative text-sm">
              <span className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-white dark:ring-gray-950" aria-hidden="true" />
              <p className="flex flex-wrap items-center gap-2">
                {event.previous_status && (
                  <>
                    <StatusBadge status={event.previous_status} />
                    <span aria-hidden="true">→</span>
                    <span className="sr-only">changed to</span>
                  </>
                )}
                <StatusBadge status={event.status} />
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {when(event.changed_at)} · {SOURCE_TEXT[event.source] ?? ''}
                {event.changed_by && ` ${event.changed_by}.`}
              </p>
            </li>
          ))}
        </ol>
      )}

      {data.history_began_at && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <History className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          The history is kept from {momentDay(data.history_began_at)}. Changes before then were not recorded.
        </p>
      )}
    </div>
  )
}
