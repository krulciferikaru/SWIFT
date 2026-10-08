import { useCallback, useEffect, useState } from 'react'
import auditLogsApi from '../api/auditLogs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import TourButton from '../components/TourButton.jsx'
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
  'plan.created': 'Added a service plan',
  'plan.updated': 'Edited a service plan',
  'plan.archived': 'Archived a service plan',
  'plan.restored': 'Restored a service plan',
  'plan.deleted_permanently': 'Permanently deleted a service plan',
  'user.created': 'Created a staff account',
  'user.status_changed': 'Changed an account’s status',
  'user.password_reset': 'Reset a password',
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
  contact_number: 'Contact number',
  mac_address: 'MAC address',
  connection_date: 'Connection date',
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

export default function AuditTrail() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [logs, setLogs] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await auditLogsApi.getAll({
        page,
        per_page: 25,
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
    }
  }, [page, debouncedSearch, category, from, to])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useOnReconnect(fetchLogs)

  const resetPage = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

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
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-to">To</Label>
          <Input id="audit-to" type="date" value={to} onChange={resetPage(setTo)} min={from || undefined} />
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">{error}</div>
      )}

      <div data-tour="audit-table" className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
        {loading ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No activity matches these filters.</p>
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

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Showing {meta.from}–{meta.to} of {meta.total}</span>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="px-3">Page {page} of {meta.last_page}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(p + 1, meta.last_page))} disabled={page === meta.last_page}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
