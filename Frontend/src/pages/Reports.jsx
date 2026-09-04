import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Download, RefreshCw } from 'lucide-react'
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

function statusBadgeClass(status) {
  switch (status) {
    case 'Active':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
    case 'Unpaid':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
    case 'Disconnected':
      return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
  }
}

function methodBadgeClass(method) {
  const normalized = (method || '').toLowerCase()

  if (normalized.includes('cash')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
  }

  if (normalized.includes('gcash') || normalized.includes('mobile')) {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
  }

  if (normalized.includes('bank') || normalized.includes('transfer')) {
    return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300'
  }

  return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
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

function createSampleCollectionsData(month) {
  const currentMonth = month || useCurrentMonth()

  return {
    summary: {
      payment_count: 18,
      paying_subscribers: 12,
      total_collected: 184500,
    },
    by_plan: [
      { plan_id: 1, plan_name: 'Basic Internet', payment_count: 7, subscriber_count: 6, total_collected: 82000 },
      { plan_id: 2, plan_name: 'Home Plus', payment_count: 5, subscriber_count: 4, total_collected: 56000 },
      { plan_id: 3, plan_name: 'Business Pro', payment_count: 4, subscriber_count: 2, total_collected: 46500 },
    ],
    by_method: [
      { payment_method: 'Cash', payment_count: 8, subscriber_count: 6, total_collected: 72000 },
      { payment_method: 'GCash', payment_count: 6, subscriber_count: 4, total_collected: 61000 },
      { payment_method: 'Bank Transfer', payment_count: 4, subscriber_count: 2, total_collected: 51500 },
    ],
    payments: [
      { id: 1, payment_date: `${currentMonth}-02`, subscriber_name: 'Ana Dela Cruz', plan_name: 'Basic Internet', amount: 3500, payment_method: 'Cash', or_number: 'OR-1042' },
      { id: 2, payment_date: `${currentMonth}-04`, subscriber_name: 'Marco Santos', plan_name: 'Home Plus', amount: 4200, payment_method: 'GCash', or_number: 'OR-1043' },
      { id: 3, payment_date: `${currentMonth}-06`, subscriber_name: 'Leah Mercado', plan_name: 'Business Pro', amount: 8600, payment_method: 'Bank Transfer', or_number: 'OR-1048' },
      { id: 4, payment_date: `${currentMonth}-09`, subscriber_name: 'Rafael Tan', plan_name: 'Basic Internet', amount: 3500, payment_method: 'Cash', or_number: 'OR-1050' },
      { id: 5, payment_date: `${currentMonth}-12`, subscriber_name: 'Mia Villanueva', plan_name: 'Home Plus', amount: 4200, payment_method: 'GCash', or_number: 'OR-1054' },
      { id: 6, payment_date: `${currentMonth}-14`, subscriber_name: 'Chris Garcia', plan_name: 'Business Pro', amount: 8600, payment_method: 'Cash', or_number: 'OR-1058' },
    ],
  }
}

function createSampleStatementData(month) {
  const currentMonth = month || useCurrentMonth()

  return {
    summary: {
      subscriber_count: 28,
      total_owed: 243500,
      total_paid: 184500,
      total_outstanding: 59000,
      total_advance_credit: 0,
      active_subscribers: 24,
      unpaid_subscribers: 3,
      disconnected_subscribers: 1,
    },
    by_plan: [
      { plan_id: 1, plan_name: 'Basic Internet', subscriber_count: 12, total_owed: 96000, total_paid: 78000, total_outstanding: 18000, total_advance_credit: 0 },
      { plan_id: 2, plan_name: 'Home Plus', subscriber_count: 9, total_owed: 87000, total_paid: 62000, total_outstanding: 25000, total_advance_credit: 0 },
      { plan_id: 3, plan_name: 'Business Pro', subscriber_count: 7, total_owed: 60500, total_paid: 44500, total_outstanding: 16000, total_advance_credit: 0 },
    ],
    subscribers: [
      { subscriber_id: 1, name: 'Ana Dela Cruz', plan_name: 'Basic Internet', status: 'Active', monthly_rate: 3500, balance: 0, months_behind: 0 },
      { subscriber_id: 2, name: 'Marco Santos', plan_name: 'Home Plus', status: 'Active', monthly_rate: 4200, balance: 4200, months_behind: 1 },
      { subscriber_id: 3, name: 'Leah Mercado', plan_name: 'Business Pro', status: 'Active', monthly_rate: 8600, balance: 0, months_behind: 0 },
      { subscriber_id: 4, name: 'Rafael Tan', plan_name: 'Basic Internet', status: 'Active', monthly_rate: 3500, balance: 0, months_behind: 0 },
      { subscriber_id: 5, name: 'Mia Villanueva', plan_name: 'Home Plus', status: 'Unpaid', monthly_rate: 4200, balance: 8400, months_behind: 2 },
      { subscriber_id: 6, name: 'Chris Garcia', plan_name: 'Business Pro', status: 'Active', monthly_rate: 8600, balance: 0, months_behind: 0 },
    ],
  }
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

  const displayCollections = useMemo(() => collections ?? createSampleCollectionsData(month), [collections, month])
  const displayStatement = useMemo(() => statement ?? createSampleStatementData(month), [statement, month])

  const collectionSummaryCards = useMemo(() => {
    if (!displayCollections) return []
    return [
      { label: 'Payments', value: displayCollections.summary.payment_count, tone: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' },
      { label: 'Paying Subscribers', value: displayCollections.summary.paying_subscribers, tone: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300' },
      { label: 'Collected', value: money(displayCollections.summary.total_collected), tone: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300' },
    ]
  }, [displayCollections])

  const statementSummaryCards = useMemo(() => {
    if (!displayStatement) return []
    return [
      { label: 'Subscribers', value: displayStatement.summary.subscriber_count, tone: 'bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200' },
      { label: 'Receivables', value: money(displayStatement.summary.total_owed), tone: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300' },
      { label: 'Paid', value: money(displayStatement.summary.total_paid), tone: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' },
      { label: 'Outstanding', value: money(displayStatement.summary.total_outstanding), tone: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300' },
    ]
  }, [displayStatement])

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
          {/* <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
            <FileText className="size-3.5" />
            Reports
          </div> */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Monthly collection and financial overview
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Review the monthly collection totals and subscriber financial position for the selected period.
            Export the report to PDF or Excel when needed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex items-center gap-3">
            <label className="whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">
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

      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80">
            <CardTitle className="text-slate-900 dark:text-slate-100">Monthly Collection Report</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Summary of collections, payment methods, and ledger activity for the selected month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => exportReport('collections', 'pdf')}
                disabled={exporting === 'collections-pdf' || loading || !displayCollections}
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'collections-pdf' ? 'Downloading…' : 'PDF'}
              </Button>
              <Button
                onClick={() => exportReport('collections', 'xlsx')}
                disabled={exporting === 'collections-xlsx' || loading || !displayCollections}
                variant="outline"
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'collections-xlsx' ? 'Downloading…' : 'XLSX'}
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading report…</p>
            ) : displayCollections ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {collectionSummaryCards.map((card) => (
                    <div key={card.label} className={`rounded-xl border px-4 py-3 shadow-sm ${card.tone}`}>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-80">{card.label}</p>
                      <p className="mt-2 text-lg font-bold">{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                      Collections by Plan
                    </p>
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-100 dark:bg-slate-900/80">
                            <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Plan</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Subscribers</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Payments</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Collected</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayCollections.by_plan.map((row, index) => (
                            <TableRow key={row.plan_id} className={index % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50 dark:bg-slate-900/80'}>
                              <TableCell className="font-bold text-slate-800 dark:text-slate-100">{row.plan_name}</TableCell>
                              <TableCell className="font-medium text-slate-700 dark:text-slate-300">{row.subscriber_count}</TableCell>
                              <TableCell className="font-medium text-slate-700 dark:text-slate-300">{row.payment_count}</TableCell>
                              <TableCell className="text-right font-black text-slate-900 dark:text-slate-100">{money(row.total_collected)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                      Collections by Method
                    </p>
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-900/60">
                            <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Method</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Subscribers</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Payments</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Collected</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayCollections.by_method.map((row, index) => (
                            <TableRow key={row.payment_method} className={index % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50 dark:bg-slate-900/80'}>
                              <TableCell>
                                <Badge className={methodBadgeClass(row.payment_method)}>{row.payment_method}</Badge>
                              </TableCell>
                              <TableCell>{row.subscriber_count}</TableCell>
                              <TableCell>{row.payment_count}</TableCell>
                              <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100">{money(row.total_collected)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                      Payment Ledger
                    </p>
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-100 dark:bg-slate-900/80">
                            <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Date</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Subscriber</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Plan</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">OR</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Method</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayCollections.payments.map((row, index) => (
                            <TableRow key={row.id} className={index % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50 dark:bg-slate-900/80'}>
                              <TableCell>{row.payment_date}</TableCell>
                              <TableCell className="font-bold text-slate-800 dark:text-slate-100">{row.subscriber_name}</TableCell>
                              <TableCell className="text-slate-700 dark:text-slate-300">{row.plan_name}</TableCell>
                              <TableCell className="font-medium text-slate-700 dark:text-slate-300">{row.or_number}</TableCell>
                              <TableCell>
                                <Badge className={methodBadgeClass(row.payment_method)}>{row.payment_method}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100">{money(row.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No collections data.</p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80">
            <CardTitle className="text-slate-900 dark:text-slate-100">Financial Statement</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Subscriber balances, outstanding amounts, and plan-level financial position for the selected month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => exportReport('statement', 'pdf')}
                disabled={exporting === 'statement-pdf' || loading || !displayStatement}
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'statement-pdf' ? 'Downloading…' : 'PDF'}
              </Button>
              <Button
                onClick={() => exportReport('statement', 'xlsx')}
                disabled={exporting === 'statement-xlsx' || loading || !displayStatement}
                variant="outline"
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'statement-xlsx' ? 'Downloading…' : 'XLSX'}
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading report…</p>
            ) : displayStatement ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {statementSummaryCards.map((card) => (
                    <div key={card.label} className={`rounded-xl border px-4 py-3 shadow-sm ${card.tone}`}>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-80">{card.label}</p>
                      <p className="mt-2 text-lg font-bold">{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Active</p>
                    <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{displayStatement.summary.active_subscribers}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Unpaid / Disconnected</p>
                    <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{displayStatement.summary.unpaid_subscribers} / {displayStatement.summary.disconnected_subscribers}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                    Financial Position by Plan
                  </p>
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 dark:bg-slate-900/80">
                          <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Plan</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Subscribers</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Receivables</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Paid</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Outstanding</TableHead>
                          <TableHead className="text-right text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayStatement.by_plan.map((row, index) => (
                          <TableRow key={row.plan_id} className={index % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50 dark:bg-slate-900/80'}>
                            <TableCell className="font-bold text-slate-800 dark:text-slate-100">{row.plan_name}</TableCell>
                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">{row.subscriber_count}</TableCell>
                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">{money(row.total_owed)}</TableCell>
                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">{money(row.total_paid)}</TableCell>
                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">{money(row.total_outstanding)}</TableCell>
                            <TableCell className="text-right font-black text-slate-900 dark:text-slate-100">{money(row.total_advance_credit)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-100">
                    Subscriber Ledger
                  </p>
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100 dark:bg-slate-900/80">
                          <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Subscriber</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Plan</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Status</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Monthly Rate</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Balance</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Behind</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayStatement.subscribers.map((row, index) => (
                          <TableRow key={row.subscriber_id} className={index % 2 === 0 ? 'bg-white dark:bg-slate-900/40' : 'bg-slate-50 dark:bg-slate-900/80'}>
                            <TableCell className="font-bold text-slate-800 dark:text-slate-100">{row.name}</TableCell>
                            <TableCell className="text-slate-700 dark:text-slate-300">{row.plan_name}</TableCell>
                            <TableCell>
                              <Badge className={statusBadgeClass(row.status)}>{row.status}</Badge>
                            </TableCell>
                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">{money(row.monthly_rate)}</TableCell>
                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">{money(row.balance)}</TableCell>
                            <TableCell className="font-bold text-slate-800 dark:text-slate-100">{row.months_behind}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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