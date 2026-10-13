import { useCallback, useEffect, useRef, useState } from 'react'
import auditLogsApi from '../api/auditLogs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import TourButton from '../components/TourButton.jsx'
import { TableSkeleton } from '../components/Skeletons.jsx'
import DateHint from '../components/DateHint.jsx'
import { useQueryState } from '../hooks/useQueryState'
import Pager from '../components/Pager.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { ScrollText } from 'lucide-react'
import { errorMessage } from '../utils/errors'
import { useOnReconnect } from '../hooks/useOnline'

const ACTION_LABELS = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed sign-in attempt',
  'subscriber.created': 'Added a subscriber',
  'subscriber.updated': 'Edited a subscriber',
  'subscriber.status_changed': 'Changed a subscriber’s status',
  'subscriber.archived': 'Archived a subscriber',
  'subscriber.restored': 'Restored a subscriber',
  'subscriber.deleted_permanently': 'Permanently deleted a subscriber',
  'approval.approved': 'Approved a registration',
  'approval.rejected': 'Rejected a registration',
  'claim.approved': 'Approved an account claim',
  'claim.rejected': 'Rejected an account claim',
  'payment.recorded': 'Recorded a payment',
  'payment.voided': 'Cancelled a payment',
  'plan.created': 'Added a service plan',
  'plan.updated': 'Edited a service plan',
  'plan.archived': 'Archived a service plan',
  'plan.restored': 'Restored a service plan',
  'plan.deleted_permanently': 'Permanently deleted a service plan',
  'user.created': 'Created a staff account',
  'auth.mfa_enabled': 'Turned on two-step sign-in',
  'auth.mfa_failed': 'Wrong two-step code',
  'auth.mfa_recovery_used': 'Signed in with a recovery code',
  'auth.mfa_codes_renewed': 'Replaced their recovery codes',
  'auth.mfa_reset': 'Two-step sign-in reset by the server',
  'account.deleted_by_owner': 'Deleted their own account',
  'user.status_changed': 'Changed an account’s status',
  'user.password_reset': 'Reset a password (an old action; it is no longer possible)',
  'user.mobile_changed': 'Changed their mobile number',
  'auth.password_reset_requested': 'Asked for a password reset code',
  'auth.password_reset': 'Reset their own password',
  'company.updated': 'Updated the company contact information',
  'user.permissions_changed': 'Changed a secretary’s permissions',
  'sms.sent': 'Sent a text message',
  'sms.reminders_sent': 'Sent payment reminders',
}

const CATEGORIES = [
  ['', 'Everything'],
  ['auth', 'Sign-ins'],
  ['subscriber', 'Subscribers'],
  ['approval', 'Approvals'],
  ['claim', 'Account claims'],
  ['payment', 'Payments'],
  ['plan', 'Service plans'],
  ['user', 'Staff accounts'],
  ['account', 'Account deletions'],
  ['sms', 'Text messages'],
]

const PERMISSION_LABELS = {
  'subscribers.view': 'View subscribers',
  'subscribers.manage': 'Add and edit subscribers',
  'subscribers.archive': 'Archive subscribers',
  'approvals.manage': 'Approve registrations',
  'plans.manage': 'Manage service plans',
  'payments.view': 'View payments',
  'payments.record': 'Record payments',
  'reports.view': 'View and export reports',
  'archive.manage': 'Use the Archive',
  'sms.send': 'Send text messages',
}

const FIELD_LABELS = {
  plan_id: 'Plan',
  name: 'Name',
  plan_name: 'Plan name',
  monthly_rate: 'Monthly rate',
  speed_mbps: 'Speed (Mbps)',
  contact_number: 'Mobile number',
  mac_address: 'MAC address',
  connection_date: 'Installation date',
  account_status: 'Account status',
  amount: 'Amount',
  or_number: 'OR number',
  method: 'Method',
  payment_date: 'Payment date',
  sent: 'Sent',
  failed: 'Failed',
  success: 'Delivered',
  mobile: 'Mobile number',
  office_hours: 'Office hours',
  how_to_pay: 'How to pay',
  added: 'Allowed',
  removed: 'No longer allowed',
}

const label = (key) => FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

const show = (v) => {
  if (Array.isArray(v)) return v.length ? v.map((k) => PERMISSION_LABELS[k] ?? k).join(', ') : '—'
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

const formatWhen = (value) =>
  new Date(value).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function Changes({ changes }) {
  if (!changes || Object.keys(changes).length === 0) return <span className="text-gray-400">—</span>
  return (
    <ul className="space-y-0.5 text-xs">
      {Object.entries(changes).map(([key, value]) => (
        <li key={key}>
          <span className="font-medium text-gray-700 dark:text-gray-300">{label(key)}:</span>{' '}
          {value && typeof value === 'object' && 'old' in value ? (
            <>
              <span className="text-gray-500 dark:text-gray-400 line-through">{show(value.old)}</span>
              {' → '}
              <span className="text-gray-900 dark:text-gray-100">{show(value.new)}</span>
            </>
          ) : (
            <span className="text-gray-900 dark:text-gray-100">{show(value)}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

// What the address holds, so a filtered view survives a refresh.
const VIEW_DEFAULTS = { q: '', cat: '', from: '', to: '', page: 1, per: 25 }

export default function AuditTrail() {
  const [view, setView] = useQueryState(VIEW_DEFAULTS)
  const debouncedSearch = view.q
  const category = view.cat
  const from = view.from
  const to = view.to
  const page = view.page
  const perPage = view.per
  const setCategory = (value) => setView({ cat: value, page: 1 })
  const setFrom = (value) => setView({ from: value, page: 1 })
  const setTo = (value) => setView({ to: value, page: 1 })
  const setPage = (value) => setView({ page: Math.max(value, 1) })
  // What is typed in the search box; it reaches the address after a short pause.
  const [search, setSearch] = useState(view.q)
  const [logs, setLogs] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  // Skeletons only for the first load; later refreshes dim the table so it does not flash.
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState('')

  const latestQuery = useRef(debouncedSearch)
  latestQuery.current = debouncedSearch
  useEffect(() => {
    const t = setTimeout(() => {
      if (search !== latestQuery.current) setView({ q: search, page: 1 })
    }, 350)
    return () => clearTimeout(t)
  }, [search, setView])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await auditLogsApi.getAll({
        page,
        per_page: perPage,
        search: debouncedSearch || undefined,
        action: category || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      setLogs(res.data.data.data)
      setMeta(res.data.data)
    } catch (err) {
      setError(err.response?.status === 429 ? 'Too many requests. Please wait a moment and try again.' : errorMessage(err, 'Failed to load the audit trail.'))
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [page, perPage, debouncedSearch, category, from, to])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useOnReconnect(fetchLogs)

  const resetPage = (setter) => (e) => setter(e.target.value)

  const selectClass =
    'h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-gray-100'

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Audit Trail</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            A record of who did what and when. Entries can’t be edited or deleted from the system.
          </p>
        </div>
        <TourButton tour="audit" />
      </div>

      <div data-tour="audit-filters" className="flex flex-wrap items-end gap-3 mb-4">
        <div className="space-y-1">
          <Label htmlFor="audit-search">Search</Label>
          <Input
            id="audit-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Person or record name…"
            className="w-64"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-category">Show</Label>
          <select id="audit-category" value={category} onChange={resetPage(setCategory)} className={selectClass}>
            {CATEGORIES.map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-from">From</Label>
          <Input id="audit-from" type="date" value={from} onChange={resetPage(setFrom)} max={to || undefined} />
          <DateHint value={from} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-to">To</Label>
          <Input id="audit-to" type="date" value={to} onChange={resetPage(setTo)} min={from || undefined} />
          <DateHint value={to} />
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">{error}</div>
      )}

      <div
        data-tour="audit-table"
        aria-busy={loading}
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4 transition-opacity ${loading && !initialLoad ? 'opacity-60' : ''}`}
      >
        {initialLoad ? (
          <TableSkeleton rows={8} columns={[
            { label: 'When' }, { label: 'Who' }, { label: 'Action' }, { label: 'Record' }, { label: 'Details' },
          ]} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={search || category || from || to ? 'No activity matches these filters' : 'No activity recorded yet'}
            description={search || category || from || to ? 'Try a wider date range or a different search.' : 'Sign-ins, edits, payments and other actions will be listed here as they happen.'}
            onClearFilters={search || category || from || to ? () => { setSearch(''); setView({ q: '', cat: '', from: '', to: '', page: 1 }) } : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-gray-600 dark:text-gray-400">{formatWhen(log.created_at)}</TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100">
                    {log.user_name ?? <span className="text-gray-500 dark:text-gray-400">Not signed in</span>}
                    {log.user_role && <span className="block text-xs text-gray-500 dark:text-gray-400 capitalize">{log.user_role}</span>}
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-gray-100">{ACTION_LABELS[log.action] ?? log.action}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{log.subject_label ?? '—'}</TableCell>
                  <TableCell className="whitespace-normal min-w-56"><Changes changes={log.changes} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Pager
        meta={meta}
        page={page}
        onPage={setPage}
        perPage={perPage}
        onPerPage={(n) => setView({ per: n, page: 1 })}
        noun="entries"
        sizes={[25, 50, 100]}
      />
    </div>
  )
}
