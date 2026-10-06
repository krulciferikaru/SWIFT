import { useCallback, useEffect, useState } from 'react'
import archiveApi from '../api/archive'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import Toast from "../components/Toast.jsx";
import TourButton from "../components/TourButton.jsx";
import { useTourActive } from "../tour/tourState";
import { ArchiveSample } from "../components/TourSamples.jsx";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function ArchivePage() {
  const tourActive = useTourActive()
  const [tab, setTab] = useState('subscribers')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const { toast, showToast } = useToast()

  const isSubscribers = tab === 'subscribers'

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (isSubscribers) {
        const res = await archiveApi.getSubscribers({ page, per_page: 15, search: search || undefined })
        setItems(res.data.data.data)
        setMeta(res.data.data)
      } else {
        const res = await archiveApi.getPlans()
        setItems(res.data.data)
        setMeta(null)
      }
    } catch {
      setError('Failed to load archived records.')
    } finally {
      setLoading(false)
    }
  }, [isSubscribers, page, search])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const switchTab = (next) => {
    // Clicking the tab you are already on would clear the list without reloading it.
    if (next === tab) return
    setTab(next)
    setPage(1)
    setSearch('')
    setItems([])
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
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search by name, contact number, address, MAC…"
          aria-label="Search archived subscribers"
          className="mb-4 max-w-md"
        />
      )}

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">{error}</div>
      )}

      <div data-tour="archive-list" className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
        {loading ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <>
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Nothing archived here.</p>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Contact Number</TableHead>
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
                <TableHead>Archived On</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={idOf(item)}>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">{nameOf(item)}</TableCell>
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
                      <Button variant="outline" size="sm" onClick={() => restore(item)} aria-label={`Restore ${item.name || item.plan_name}`}>
                        Restore
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item.name || item.plan_name} permanently`}>
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

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Showing {meta.from}–{meta.to} of {meta.total}
          </span>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="px-3">
              Page {page} of {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, meta.last_page))}
              disabled={page === meta.last_page}
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={busy} className="bg-red-600 hover:bg-red-700">
              {busy ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
