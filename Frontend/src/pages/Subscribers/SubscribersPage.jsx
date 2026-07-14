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
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useState, useEffect } from 'react'
import reportApi from '../../api/reports'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import SubscriberForm from './SubscriberForm'
import CsvPreviewTable from '../../components/CsvPreviewTable'
import { useSubscribers } from '../../hooks/useSubscribers'
import { useToast } from '../../hooks/useToast'
import { parseCsvRows } from '../../utils/csvParser'
import subscriberApi from '../../api/subscribers'

const STATUSES = ['All', 'Active', 'Unpaid', 'Disconnected']

export default function SubscribersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)

  const { subscribers, meta, summary, loading, error, refetch, refetchSummary } =
    useSubscribers({ search, status, page })

  const { toast, showToast } = useToast()

  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [showPreview, setShowPreview] = useState(false)
  const [previewHeaders, setPreviewHeaders] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, status])

  // -----------------------------------------------------------------------
  // CRUD handlers
  // -----------------------------------------------------------------------

  const handleAdd = async (form) => {
    setFormLoading(true)
    try {
      await subscriberApi.create(form)
      setShowAdd(false)
      showToast('Subscriber added successfully.')
      refetch()
      refetchSummary()
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = async (form) => {
    setFormLoading(true)
    try {
      await subscriberApi.update(editTarget.subscriber_id, form)
      setEditTarget(null)
      showToast('Subscriber updated successfully.')
      refetch()
      refetchSummary()
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const response = await subscriberApi.delete(deleteTarget.subscriber_id)

      if (response.status < 200 || response.status >= 300) {
        throw new Error('Delete request was not successful.')
      }

      setDeleteTarget(null)
      showToast('Subscriber deleted.', 'success')
      await refetch()
      await refetchSummary()
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Delete failed.'
      showToast(msg, 'error')
      return
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleExportReport = async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (status !== 'All') params.status = status

      const res = await reportApi.downloadSubscribers(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'subscribers_report.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      showToast('Report downloaded successfully.')
    } catch {
      showToast('Failed to download report.', 'error')
    }
  }

  const fetchPreviewCsv = async () => {
    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewHeaders([])
    setPreviewRows([])

    try {
      const params = {}
      if (search) params.search = search
      if (status !== 'All') params.status = status

      const res = await reportApi.previewSubscribers(params)
      const csvText = await res.data.text()
      const rows = parseCsvRows(csvText)

      if (rows.length > 0) {
        setPreviewHeaders(rows[0])
        setPreviewRows(rows.slice(1))
      }
    } catch {
      setPreviewError('Unable to load report preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => {
    if (showPreview) {
      fetchPreviewCsv()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreview, search, status])

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md text-sm text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}>
          {toast.message}
        </div>
      )}

      <div className="space-y-6">
        <div className="mb-6">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Subscribers</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all cable TV subscribers for Palayan Branch.</p>
            </>
          )}
        </div>

        {summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: 'Total', value: summary.total, color: 'text-gray-800 dark:text-gray-200' },
              { label: 'Pending', value: summary.pending, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Active', value: summary.active, color: 'text-green-600 dark:text-green-400' },
              { label: 'Unpaid', value: summary.unpaid, color: 'text-yellow-600 dark:text-yellow-400' },
              { label: 'Disconnected', value: summary.disconnected, color: 'text-red-600 dark:text-red-400' },
            ].map((card) => (
              <div key={card.label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-10" />
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        {loading ? (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-full sm:w-40" />
            <Skeleton className="h-9 w-full sm:w-32" />
            <Skeleton className="h-9 w-full sm:w-36" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Input
              type="text"
              placeholder="Search by name, email, address, MAC…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => setShowPreview(true)}
              className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
            >
              Export CSV
            </Button>

            <Button onClick={() => setShowAdd(true)} className="whitespace-nowrap">
              Add Subscriber
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-10" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-14" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-14" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 9 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : error ? (
            <div className="text-center py-16 text-sm text-red-500 dark:text-red-400">{error}</div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-500">
              No subscribers found.{search || status !== 'All' ? ' Try adjusting your filters.' : ''}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>MAC Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((sub) => (
                  <TableRow key={sub.subscriber_id}>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">{sub.name}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{sub.plan?.plan_name ?? '—'}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{sub.email}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{sub.contact || sub.contact_number || '—'}</TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-500 font-mono text-xs">{sub.mac_address || '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={sub.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setEditTarget(sub)}
                          className="h-auto p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setDeleteTarget(sub)}
                          className="h-auto p-0 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
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

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Showing {meta.from}–{meta.to} of {meta.total} subscribers</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="px-3 py-1">Page {page} of {meta.last_page}</span>
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
      </div>

      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="CSV Preview" size="xl">
        <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          <div className="bg-slate-950 px-4 py-3 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">CSV Viewer</p>
              <p className="text-lg font-semibold">subscribers_report.csv</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-900"
              >
                Close
              </Button>
              <Button
                onClick={handleExportReport}
                className="bg-green-600 hover:bg-green-700"
              >
                Download CSV
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-4">
            <CsvPreviewTable
              headers={previewHeaders}
              rows={previewRows}
              loading={previewLoading}
              error={previewError}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Subscriber"
        description="Fill in the subscriber's details below."
        size="lg"
        confirmClose
        footer={(requestClose) => (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" form="add-subscriber-form" disabled={formLoading}>
              {formLoading ? 'Saving...' : 'Save Subscriber'}
            </Button>
          </div>
        )}
      >
        <SubscriberForm formId="add-subscriber-form" onSubmit={handleAdd} onCancel={() => setShowAdd(false)} loading={formLoading} />
      </Modal>

      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Subscriber"
        description="Update the subscriber's details below."
        size="lg"
        confirmClose
        footer={(requestClose) => (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" form="edit-subscriber-form" disabled={formLoading}>
              {formLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      >
        {editTarget && (
          <SubscriberForm
            formId="edit-subscriber-form"
            initial={{
              plan_id: editTarget.plan_id ?? '',
              name: editTarget.name ?? '',
              address: editTarget.address ?? '',
              contact_number: editTarget.contact ?? editTarget.contact_number ?? '',
              email: editTarget.email ?? '',
              mac_address: editTarget.mac_address ?? '',
              connection_date: (editTarget.installation_date ?? editTarget.connection_date ?? '').slice(0, 10),
              status: editTarget.status ?? 'Active',
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            loading={formLoading}
          />
        )}
      </Modal>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscriber</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Subscriber'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}