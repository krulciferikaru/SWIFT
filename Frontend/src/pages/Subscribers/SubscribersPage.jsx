import { useState, useEffect, useCallback } from 'react'
import subscriberApi from '../../api/subscribers'
import reportApi from '../../api/reports'
import Modal from '../../components/Modal'
import ConfirmDialog from '../../components/ConfirmDialog'
import StatusBadge from '../../components/StatusBadge'
import SubscriberForm from './SubscriberForm'

const STATUSES = ['All', 'Active', 'Unpaid', 'Disconnected']

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState([])
  const [meta, setMeta]               = useState(null)       // pagination meta
  const [summary, setSummary]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  // Filters
  const [search, setSearch]           = useState('')
  const [status, setStatus]           = useState('All')
  const [page, setPage]               = useState(1)

  // Modals
  const [showAdd, setShowAdd]         = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast]             = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewHeaders, setPreviewHeaders] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)

  const previewRowCount = previewRows.length

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchSubscribers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cacheBuster = Date.now()
      const params = { page, per_page: 15 }
      params._ = cacheBuster
      if (search)           params.search = search
      if (status !== 'All') params.status = status

      const res = await subscriberApi.getAll(params)

      // Handle both paginated and non-paginated responses
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

  const fetchSummary = async () => {
    try {
      const res = await subscriberApi.getSummary()
      setSummary(res.data.data)
    } catch {
      // Non-critical — summary cards just won't show
    }
  }

  useEffect(() => {
    fetchSubscribers()
  }, [fetchSubscribers])

  useEffect(() => {
    fetchSummary()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, status])

  // -----------------------------------------------------------------------
  // Toast helper
  // -----------------------------------------------------------------------

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // -----------------------------------------------------------------------
  // CRUD handlers
  // -----------------------------------------------------------------------

  const handleAdd = async (form) => {
    setFormLoading(true)
    try {
      await subscriberApi.create(form)
      setShowAdd(false)
      showToast('Subscriber added successfully.')
      fetchSubscribers()
      fetchSummary()
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
      fetchSubscribers()
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
      await fetchSubscribers()
      await fetchSummary()
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

  const parseCsvRows = (csvText) => {
    const rows = []
    let row = []
    let field = ''
    let inQuotes = false

    for (let i = 0; i < csvText.length; i += 1) {
      const char = csvText[i]
      const next = csvText[i + 1]

      if (char === '"') {
        if (inQuotes && next === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        row.push(field)
        field = ''
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') {
          i += 1
        }
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else {
        field += char
      }
    }

    if (field !== '' || row.length > 0) {
      row.push(field)
      rows.push(row)
    }

    return rows
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

  const openReportPreview = () => {
    setShowPreview(true)
  }

  useEffect(() => {
    if (showPreview) {
      fetchPreviewCsv()
    }
  }, [showPreview, search, status])

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md text-sm text-white ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Subscribers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all cable TV subscribers for Palayan Branch.</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total',        value: summary.total,        color: 'text-gray-800' },
              { label: 'Pending',      value: summary.pending,      color: 'text-blue-600' },
              { label: 'Active',       value: summary.active,       color: 'text-green-600' },
              { label: 'Unpaid',       value: summary.unpaid,       color: 'text-yellow-600' },
              { label: 'Disconnected', value: summary.disconnected, color: 'text-red-600' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, email, address, MAC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>

          {/* Export button opens preview modal */}
          <button
            onClick={openReportPreview}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-md hover:bg-green-700 whitespace-nowrap"
          >
            Export CSV
          </button>

          {/* Add button */}
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-md hover:bg-blue-700 whitespace-nowrap"
          >
            + Add Subscriber
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-sm text-gray-400">Loading subscribers…</div>
          ) : error ? (
            <div className="text-center py-16 text-sm text-red-500">{error}</div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">
              No subscribers found.{search || status !== 'All' ? ' Try adjusting your filters.' : ''}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Plan', 'Email', 'Contact', 'MAC Address', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscribers.map((sub) => (
                  <tr key={sub.subscriber_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{sub.name}</td>
                    <td className="px-4 py-3 text-gray-600">{sub.plan?.plan_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{sub.email}</td>
                    <td className="px-4 py-3 text-gray-600">{sub.contact || sub.contact_number || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{sub.mac_address || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditTarget(sub)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(sub)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>
              Showing {meta.from}–{meta.to} of {meta.total} subscribers
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 py-1">Page {page} of {meta.last_page}</span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, meta.last_page))}
                disabled={page === meta.last_page}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="CSV Preview" size="xl">
        <div className="space-y-4 rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-slate-950 px-4 py-3 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">CSV Viewer</p>
              <p className="text-lg font-semibold">subscribers_report.csv</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-md hover:bg-slate-900"
              >
                Close
              </button>
              <button
                onClick={handleExportReport}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Download CSV
              </button>
            </div>
          </div>

          <div className="bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Preview</p>
                <p className="text-sm text-slate-700">CSV file contents shown as rows and columns</p>
              </div>
              <div className="text-xs text-gray-500">{previewRowCount} row{previewRowCount === 1 ? '' : 's'}</div>
            </div>

            {previewError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {previewError}
              </div>
            )}

            {previewLoading ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">Loading preview…</div>
            ) : previewRows.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">No preview data available.</div>
            ) : (
              <div className="overflow-auto max-h-[60vh] rounded-lg border border-slate-200">
                <table className="min-w-full text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr>
                      {previewHeaders.map((header, index) => (
                        <th
                          key={index}
                          className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rowIndex) => (
                      <tr
                        key={rowIndex}
                        className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                      >
                        {previewHeaders.map((_, colIndex) => (
                          <td
                            key={`${rowIndex}-${colIndex}`}
                            className="border-b border-slate-100 px-3 py-2 align-top text-slate-800 whitespace-pre-wrap"
                          >
                            {row[colIndex] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Subscriber" size="lg">
        <SubscriberForm
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
          loading={formLoading}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Subscriber" size="lg">
        {editTarget && (
          <SubscriberForm
            initial={{
              plan_id:          editTarget.plan_id ?? '',
              name:             editTarget.name ?? '',
              address:          editTarget.address ?? '',
              contact_number:   editTarget.contact ?? editTarget.contact_number ?? '',
              email:            editTarget.email ?? '',
              mac_address:      editTarget.mac_address ?? '',
              connection_date:  (editTarget.installation_date ?? editTarget.connection_date ?? '').slice(0, 10),
              status:           editTarget.status ?? 'Active',
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            loading={formLoading}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Subscriber"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
      />
    </div>
  )
}
