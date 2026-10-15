import { useCallback, useEffect, useState } from 'react'
import archiveApi from '../api/archive'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Archive as ArchiveIcon, RotateCcw, Trash2 } from 'lucide-react'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmAction from '../components/ConfirmAction.jsx'
import { useQueryState } from '../hooks/useQueryState'
import SortableHead, { nextSort } from '../components/SortableHead.jsx'
import Pager from '../components/Pager.jsx'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { useToast } from '../hooks/useToast'
import { TableSkeleton } from '../components/Skeletons.jsx'
import { errorMessage } from '../utils/errors'
import { useOnReconnect } from '../hooks/useOnline'
import Toast from "../components/Toast.jsx";
import TourButton from "../components/TourButton.jsx";
import { useTourActive } from "../tour/tourState";
import { ArchiveSample } from "../components/TourSamples.jsx";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

// What the address holds. Most recently archived first until a column is chosen.
const VIEW_DEFAULTS = { t: 'subscribers', q: '', page: 1, per: 15, sort: 'archived', dir: 'desc' }
const ARCHIVE_SORT_DEFAULT = { sort: 'archived', dir: 'desc' }

// The reasons a subscriber can give when they delete their own account.
const REASON_LABELS = {
  not_using: 'no longer uses the service',
  moved: 'moved away',
  switched: 'switched provider',
  price: 'costs too much',
  privacy: 'privacy concerns',
  duplicate: 'has another account',
  other: 'another reason',
}

export default function ArchivePage() {
  const tourActive = useTourActive()
  const [view, setView] = useQueryState(VIEW_DEFAULTS)
  const tab = view.t === 'plans' ? 'plans' : 'subscribers'
  const search = view.q
  const page = view.page
  const perPage = view.per
  const sort = view.sort
  const dir = view.dir
  const setPage = (value) => setView({ page: Math.max(value, 1) })
  const changeSort = (column) => setView(nextSort({ sort, dir }, column, ARCHIVE_SORT_DEFAULT))
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  // The record about to be restored: staff confirm first.
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const [busy, setBusy] = useState(false)
  const { toast, showToast } = useToast()

  const isSubscribers = tab === 'subscribers'

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (isSubscribers) {
        const res = await archiveApi.getSubscribers({ page, per_page: perPage, search: search || undefined, sort, direction: dir })
        setItems(res.data.data.data)
        setMeta(res.data.data)
      } else {
        const res = await archiveApi.getPlans()
        setItems(res.data.data)
        setMeta(null)
      }
    } catch (err) {
      setError(errorMessage(err, 'Failed to load archived records.'))
    } finally {
      setLoading(false)
    }
  }, [isSubscribers, page, perPage, search, sort, dir])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useOnReconnect(fetchItems)

  const switchTab = (next) => {
    // Clicking the tab you are already on would clear the list without reloading it.
    if (next === tab) return
    setItems([])
    setView({ t: next, q: '', page: 1, sort: 'archived', dir: 'desc' })
  }

  const idOf = (item) => (isSubscribers ? item.subscriber_id : item.plan_id)
  const nameOf = (item) => (isSubscribers ? item.name : item.plan_name)

  const restore = async (item) => {
    try {
      await (isSubscribers ? archiveApi.restoreSubscriber(idOf(item)) : archiveApi.restorePlan(idOf(item)))
      showToast(`"${nameOf(item)}" was restored.`)
      fetchItems()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to restore.', 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await (isSubscribers
        ? archiveApi.deleteSubscriber(idOf(deleteTarget))
        : archiveApi.deletePlan(idOf(deleteTarget)))
      showToast(`"${nameOf(deleteTarget)}" was permanently deleted.`)
      fetchItems()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete.', 'error')
    } finally {
      setBusy(false)
      setDeleteTarget(null)
    }
  }

  const tabClass = (active) =>
    `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
      active
        ? 'border-primary text-primary'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`

  return (
    <div>
      <Toast toast={toast} />

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Archive</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Archived records are hidden from the rest of the system. Restore them, or delete them permanently here.
          </p>
        </div>
        <TourButton tour="archive" />
      </div>

      <div data-tour="archive-tabs" className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button data-tour="archive-tab-subscribers" className={tabClass(isSubscribers)} aria-pressed={isSubscribers} onClick={() => switchTab('subscribers')}>
          Subscribers
        </button>
        <button data-tour="archive-tab-plans" className={tabClass(!isSubscribers)} aria-pressed={!isSubscribers} onClick={() => switchTab('plans')}>
          Service Plans
        </button>
      </div>

      {isSubscribers && (
        <Input
          data-tour="archive-search"
          value={search}
          onChange={(e) => {
            setView({ q: e.target.value, page: 1 })
          }}
          placeholder="Search by name, mobile number, address, MAC…"
          aria-label="Search archived subscribers"
          className="mb-4 max-w-md"
        />
      )}

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">{error}</div>
      )}

      <div data-tour="archive-list" className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
        {loading ? (
          <TableSkeleton rows={5} columns={
            isSubscribers
              ? [{ label: 'Name' }, { label: 'Plan' }, { label: 'Mobile Number' }, { label: 'Address' }, { label: 'Archived On' }, { label: 'Actions', kind: 'actions' }]
              : [{ label: 'Name' }, { label: 'Rate' }, { label: 'Speed (Mbps)' }, { label: 'Description' }, { label: 'Archived On' }, { label: 'Actions', kind: 'actions' }]
          } />
        ) : items.length === 0 ? (
          <>
            <EmptyState
              icon={ArchiveIcon}
              title={search ? 'No archived subscribers match your search' : `No archived ${isSubscribers ? 'subscribers' : 'plans'}`}
              description={search
                ? 'Check the spelling, or clear the search to see everything that was archived.'
                : `Anything you archive is kept here, not deleted. You can restore ${isSubscribers ? 'a subscriber' : 'a plan'} or delete it for good.`}
              onClearFilters={search ? () => setView({ q: '', page: 1 }) : undefined}
            />
            {tourActive && (
              <div className="px-6 pb-6">
                <ArchiveSample kind={isSubscribers ? 'subscriber' : 'plan'} />
              </div>
            )}
          </>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {isSubscribers ? (
                  <>
                    <SortableHead column="name" sort={sort} dir={dir} onSort={changeSort}>Name</SortableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Mobile Number</TableHead>
                    <TableHead>Address</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Name</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Speed (Mbps)</TableHead>
                    <TableHead>Description</TableHead>
                  </>
                )}
                {isSubscribers ? (
                  <SortableHead column="archived" sort={sort} dir={dir} onSort={changeSort}>Archived On</SortableHead>
                ) : (
                  <TableHead>Archived On</TableHead>
                )}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={idOf(item)}>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                    {nameOf(item)}
                    {isSubscribers && item.deletion && (
                      <span className="mt-0.5 block text-xs font-normal text-gray-500 dark:text-gray-400">
                        Deleted by the subscriber, {formatDate(item.deletion.created_at)}
                        {item.deletion.reason ? `: ${REASON_LABELS[item.deletion.reason] ?? item.deletion.reason}` : ''}
                      </span>
                    )}
                  </TableCell>
                  {isSubscribers ? (
                    <>
                      <TableCell className="text-gray-600 dark:text-gray-400">{item.plan?.plan_name ?? '—'}</TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">{item.contact_number || '—'}</TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">{item.address || '—'}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-gray-600 dark:text-gray-400">
                        ₱{Number(item.monthly_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400">{item.speed_mbps || '—'}</TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {item.description || '—'}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-gray-600 dark:text-gray-400">{formatDate(item.deleted_at)}</TableCell>
                  <TableCell>
                    <div data-tour="archive-row-actions" className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRestoreTarget(item)} aria-label={`Restore ${item.name || item.plan_name}`}>
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                        Restore
                      </Button>
                      <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item.name || item.plan_name} permanently`}>
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
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
        noun="archived subscribers"
      />

      <ConfirmAction
        open={!!restoreTarget}
        onOpenChange={(open) => { if (!open) setRestoreTarget(null) }}
        title={isSubscribers ? 'Restore this subscriber?' : 'Restore this plan?'}
        description={
          restoreTarget && (
            isSubscribers ? (
              <><strong>"{nameOf(restoreTarget)}"</strong> will appear in the subscriber list again, and their login (if they have one) works again.</>
            ) : (
              <><strong>"{nameOf(restoreTarget)}"</strong> will be offered to new subscribers again.</>
            )
          )
        }
        confirmLabel="Restore"
        busyLabel="Restoring..."
        busy={restoring}
        onConfirm={async () => {
          setRestoring(true)
          await restore(restoreTarget)
          setRestoring(false)
          setRestoreTarget(null)
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <strong>"{nameOf(deleteTarget)}"</strong> will be deleted for good.
                  {isSubscribers && ' Their payment history and login account will be deleted with them, which also removes those payments from past collection reports.'}{' '}
                  This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction variant="outline" onClick={confirmDelete} disabled={busy} className="border-red-300 bg-transparent text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
              {busy ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
            <AlertDialogCancel variant="default">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
