import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, RefreshCw, FileText, Table2 } from 'lucide-react'
import reportApi from '../api/reports'
import { useToast } from '../hooks/useToast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

function money(value) {
  return `PHP ${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function useCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default function Reports() {
  const [month, setMonth] = useState(useCurrentMonth())
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState('')
  const [collections, setCollections] = useState(null)
  const [statement, setStatement] = useState(null)
  const [error, setError] = useState('')
  const { toast, showToast } = useToast()

  const loadReports = async () => {
    setLoading(true)
    setError('')
    try {
      const [collectionsRes, statementRes] = await Promise.all([
        reportApi.getCollections({ month }),
        reportApi.getFinancialStatement({ month }),
      ])
      setCollections(collectionsRes.data.data)
      setStatement(statementRes.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports.')
      setCollections(null)
      setStatement(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const collectionSummaryCards = useMemo(() => {
    if (!collections) return []
    return [
      { label: 'Payments', value: collections.summary.payment_count },
      { label: 'Paying Subscribers', value: collections.summary.paying_subscribers },
      { label: 'Collected', value: money(collections.summary.total_collected) },
    ]
  }, [collections])

  const statementSummaryCards = useMemo(() => {
    if (!statement) return []
    return [
      { label: 'Subscribers', value: statement.summary.subscriber_count },
      { label: 'Owed', value: money(statement.summary.total_owed) },
      { label: 'Paid', value: money(statement.summary.total_paid) },
      { label: 'Outstanding', value: money(statement.summary.total_outstanding) },
    ]
  }, [statement])

  const exportReport = async (kind, format) => {
    const key = `${kind}-${format}`
    setExporting(key)
    try {
      let response
      let filename

      if (kind === 'collections' && format === 'pdf') {
        response = await reportApi.downloadCollectionsPdf({ month })
        filename = `collections_report_${month}.pdf`
      } else if (kind === 'collections' && format === 'xlsx') {
        response = await reportApi.downloadCollectionsXlsx({ month })
        filename = `collections_report_${month}.xlsx`
      } else if (kind === 'statement' && format === 'pdf') {
        response = await reportApi.downloadFinancialStatementPdf({ month })
        filename = `financial_statement_${month}.pdf`
      } else {
        response = await reportApi.downloadFinancialStatementXlsx({ month })
        filename = `financial_statement_${month}.xlsx`
      }

      downloadBlob(response.data, filename)
      showToast('Report downloaded successfully.')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to download report.', 'error')
    } finally {
      setExporting('')
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md text-sm text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
            <FileText className="size-3.5" />
            Reports
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Monthly collections and financial statements
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
            Use this page to test FR-6.2 through FR-6.5 directly from the frontend.
            Pick a month, load the data, then export PDF or XLSX.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Month
            </label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="sm:w-44"
            />
          </div>
          <Button onClick={loadReports} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            Reload
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle>Monthly Collection Report</CardTitle>
            <CardDescription>
              FR-6.2, FR-6.4, and FR-6.5 testing for the selected month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => exportReport('collections', 'pdf')}
                disabled={exporting === 'collections-pdf' || loading || !collections}
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'collections-pdf' ? 'Downloading…' : 'PDF'}
              </Button>
              <Button
                onClick={() => exportReport('collections', 'xlsx')}
                disabled={exporting === 'collections-xlsx' || loading || !collections}
                variant="outline"
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'collections-xlsx' ? 'Downloading…' : 'XLSX'}
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading report…</p>
            ) : collections ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {collectionSummaryCards.map((card) => (
                    <div key={card.label} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{card.label}</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Collections by Plan
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan</TableHead>
                          <TableHead>Subscribers</TableHead>
                          <TableHead>Payments</TableHead>
                          <TableHead>Collected</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {collections.by_plan.map((row) => (
                          <TableRow key={row.plan_id}>
                            <TableCell>{row.plan_name}</TableCell>
                            <TableCell>{row.subscriber_count}</TableCell>
                            <TableCell>{row.payment_count}</TableCell>
                            <TableCell>{money(row.total_collected)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Collections by Method
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Method</TableHead>
                          <TableHead>Subscribers</TableHead>
                          <TableHead>Payments</TableHead>
                          <TableHead>Collected</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {collections.by_method.map((row) => (
                          <TableRow key={row.payment_method}>
                            <TableCell>{row.payment_method}</TableCell>
                            <TableCell>{row.subscriber_count}</TableCell>
                            <TableCell>{row.payment_count}</TableCell>
                            <TableCell>{money(row.total_collected)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Payment Ledger
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Subscriber</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>OR</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {collections.payments.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.payment_date}</TableCell>
                            <TableCell>{row.subscriber_name}</TableCell>
                            <TableCell>{row.plan_name}</TableCell>
                            <TableCell>{row.or_number}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.payment_method}</Badge>
                            </TableCell>
                            <TableCell>{money(row.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No collections data.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle>Financial Statement</CardTitle>
            <CardDescription>
              FR-6.3, FR-6.4, and FR-6.5 testing for the selected month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => exportReport('statement', 'pdf')}
                disabled={exporting === 'statement-pdf' || loading || !statement}
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'statement-pdf' ? 'Downloading…' : 'PDF'}
              </Button>
              <Button
                onClick={() => exportReport('statement', 'xlsx')}
                disabled={exporting === 'statement-xlsx' || loading || !statement}
                variant="outline"
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'statement-xlsx' ? 'Downloading…' : 'XLSX'}
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading report…</p>
            ) : statement ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {statementSummaryCards.map((card) => (
                    <div key={card.label} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{card.label}</p>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Active</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{statement.summary.active_subscribers}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Unpaid / Disconnected</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{statement.summary.unpaid_subscribers} / {statement.summary.disconnected_subscribers}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Financial Position by Plan
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead>Subscribers</TableHead>
                        <TableHead>Owed</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Outstanding</TableHead>
                        <TableHead>Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statement.by_plan.map((row) => (
                        <TableRow key={row.plan_id}>
                          <TableCell>{row.plan_name}</TableCell>
                          <TableCell>{row.subscriber_count}</TableCell>
                          <TableCell>{money(row.total_owed)}</TableCell>
                          <TableCell>{money(row.total_paid)}</TableCell>
                          <TableCell>{money(row.total_outstanding)}</TableCell>
                          <TableCell>{money(row.total_advance_credit)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Subscriber Ledger
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subscriber</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Monthly Rate</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Behind</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statement.subscribers.map((row) => (
                        <TableRow key={row.subscriber_id}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.plan_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.status}</Badge>
                          </TableCell>
                          <TableCell>{money(row.monthly_rate)}</TableCell>
                          <TableCell>{money(row.balance)}</TableCell>
                          <TableCell>{row.months_behind}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No financial statement data.</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}