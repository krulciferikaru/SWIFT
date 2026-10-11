import { useEffect, useMemo, useRef, useState } from 'react'
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
import TourButton from "../components/TourButton.jsx";
import Toast from "../components/Toast.jsx";
import { useReportData, describeRequestError } from '../hooks/useReportData'
import { ReportSkeleton } from "../components/Skeletons.jsx";
import SubscriberPicker from "../components/SubscriberPicker.jsx";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import planApi from "../api/plans";

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

/** "Filtered by: Subscriber: Juan Cruz; Payment method: GCash", shown above a report's numbers. */
function FilterNote({ labels }) {
  if (!labels || labels.length === 0) return null
  return (
    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <strong>Filtered by:</strong> {labels.join('; ')}
    </p>
  )
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

const RANGE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'three_months', label: 'Last 3 Months' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Date range' },
]

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i))

export default function Reports() {
  const [range, setRange] = useState('monthly')
  const [month, setMonth] = useState(useCurrentMonth())
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [exporting, setExporting] = useState('')
  const { toast, showToast } = useToast()

  // A custom date range: from the 1st of this month to today until the person changes it.
  const today = new Date().toISOString().slice(0, 10)
  const [customFrom, setCustomFrom] = useState(`${useCurrentMonth()}-01`)
  const [customTo, setCustomTo] = useState(today)
  const customError = !customFrom || !customTo
    ? 'Choose both dates.'
    : customTo < customFrom
      ? 'The end date is before the start date.'
      : (new Date(customTo) - new Date(customFrom)) / 86400000 > 1830
        ? 'Choose a range of 5 years or less.'
        : ''
  // Only a valid range is ever sent, so typing a half-finished date does not trigger a request.
  const validCustom = useRef({ from: customFrom, to: customTo })
  if (!customError) validCustom.current = { from: customFrom, to: customTo }

  // Narrowing the reports. The subscriber, plan, method, status and OR number each apply to the
  // report(s) they make sense for; the rest ignore them.
  const [subscriber, setSubscriber] = useState(null) // { id, name }
  const [planId, setPlanId] = useState('')
  const [method, setMethod] = useState('')
  const [status, setStatus] = useState('')
  const [orNumber, setOrNumber] = useState('')
  const [plans, setPlans] = useState([])
  const { methods } = usePaymentMethods()
  useEffect(() => {
    planApi.getAll().then((res) => setPlans(Array.isArray(res.data) ? res.data : (res.data?.data ?? []))).catch(() => {})
  }, [])
  const activeFilterCount = [subscriber, planId, method, status, orNumber.trim()].filter(Boolean).length
  const clearFilters = () => {
    setSubscriber(null)
    setPlanId('')
    setMethod('')
    setStatus('')
    setOrNumber('')
  }

  // Query params + file-name key for the selected range.
  const params = useMemo(() => {
    let p
    if (range === 'annual') p = { range, year }
    else if (range === 'three_months') p = { range }
    else if (range === 'custom') p = { range, from: validCustom.current.from, to: validCustom.current.to }
    else p = { range, month }
    if (subscriber) p.subscriber_id = subscriber.id
    if (planId) p.plan_id = planId
    if (method) p.payment_method = method
    if (status) p.status = status
    if (orNumber.trim()) p.or_number = orNumber.trim()
    return p
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, month, year, customFrom, customTo, customError, subscriber, planId, method, status, orNumber])
  const periodKey = range === 'annual'
    ? year
    : range === 'three_months'
      ? 'last-3-months'
      : range === 'custom'
        ? `${validCustom.current.from}_to_${validCustom.current.to}`
        : month

  const { collections, statement, loading, error, online, reload } = useReportData(params)

  // Only ever real data: when the request fails or you are offline there is nothing to show.
  const displayCollections = collections
  const displayStatement = statement

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
        response = await reportApi.downloadCollectionsPdf(params)
        filename = `collections_report_${periodKey}.pdf`
      } else if (kind === 'collections' && format === 'xlsx') {
        response = await reportApi.downloadCollectionsXlsx(params)
        filename = `collections_report_${periodKey}.xlsx`
      } else if (kind === 'statement' && format === 'pdf') {
        response = await reportApi.downloadFinancialStatementPdf(params)
        filename = `financial_statement_${periodKey}.pdf`
      } else {
        response = await reportApi.downloadFinancialStatementXlsx(params)
        filename = `financial_statement_${periodKey}.xlsx`
      }

      downloadBlob(response.data, filename)
      showToast('Report downloaded successfully.')
    } catch (err) {
      showToast(describeRequestError(err, 'download the report').message, 'error')
    } finally {
      setExporting('')
    }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          {/* <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
            <FileText className="size-3.5" />
            Reports
          </div> */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Collection and financial overview
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Review collection totals and subscriber financial position for the selected month, the last 3 months, or a full year.
            Export the report to PDF or Excel when needed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div data-tour="reports-range" role="group" aria-label="Report period" className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={range === opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  range === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {range === 'monthly' && (
            <Input
              data-tour="reports-month"
              aria-label="Report month"
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="sm:w-44"
            />
          )}
          {range === 'annual' && (
            <select
              aria-label="Report year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm sm:w-28"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
          {range === 'custom' && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label htmlFor="report-from" className="text-xs font-medium text-gray-700 dark:text-gray-300">From</label>
                <Input id="report-from" type="date" value={customFrom} max={customTo || today} onChange={(e) => setCustomFrom(e.target.value)} className="sm:w-40" aria-invalid={customError ? true : undefined} />
              </div>
              <div className="space-y-1">
                <label htmlFor="report-to" className="text-xs font-medium text-gray-700 dark:text-gray-300">To</label>
                <Input id="report-to" type="date" value={customTo} min={customFrom || undefined} max={today} onChange={(e) => setCustomTo(e.target.value)} className="sm:w-40" aria-invalid={customError ? true : undefined} />
              </div>
            </div>
          )}
          <Button onClick={reload} disabled={loading || !online} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            Reload
          </Button>
          <TourButton tour="reports" />
        </div>
      </div>

      {range === 'custom' && customError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">{customError} Showing the last valid range.</p>
      )}

      <details data-tour="reports-filters" open={activeFilterCount > 0 ? true : undefined} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <summary className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-gray-100">
          Filters{activeFilterCount > 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">{activeFilterCount} on</span>}
        </summary>
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Narrow the reports before you read or download them. Subscriber and plan apply to both reports; payment method and OR number to the Collection Report; status to the Financial Statement.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="filter-subscriber" className="text-sm font-medium text-gray-900 dark:text-gray-100">Subscriber</label>
            <SubscriberPicker id="filter-subscriber" value={subscriber} onChange={setSubscriber} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="filter-plan" className="text-sm font-medium text-gray-900 dark:text-gray-100">Service plan</label>
            <select id="filter-plan" value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900">
              <option value="">All plans</option>
              {plans.map((p) => <option key={p.plan_id} value={p.plan_id}>{p.plan_name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="filter-method" className="text-sm font-medium text-gray-900 dark:text-gray-100">Payment method <span className="font-normal text-gray-600 dark:text-gray-400">(collections)</span></label>
            <select id="filter-method" value={method} onChange={(e) => setMethod(e.target.value)} className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900">
              <option value="">All methods</option>
              {methods.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="filter-or" className="text-sm font-medium text-gray-900 dark:text-gray-100">OR number <span className="font-normal text-gray-600 dark:text-gray-400">(collections)</span></label>
            <Input id="filter-or" value={orNumber} onChange={(e) => setOrNumber(e.target.value)} placeholder="Part of an OR number" maxLength={50} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="filter-status" className="text-sm font-medium text-gray-900 dark:text-gray-100">Subscriber status <span className="font-normal text-gray-600 dark:text-gray-400">(statement)</span></label>
            <select id="filter-status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900">
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Disconnected">Disconnected</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={clearFilters} disabled={activeFilterCount === 0}>Clear filters</Button>
          </div>
        </div>
      </details>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p>{error.message}</p>
            {(error.kind === 'network' || error.kind === 'server') && (
              <Button type="button" size="sm" variant="outline" onClick={reload}>
                Try again
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <Card data-tour="reports-collections" className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80">
            <CardTitle className="text-slate-900 dark:text-slate-100">Collection Report</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Summary of collections, payment methods, and ledger activity for the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => exportReport('collections', 'pdf')}
                disabled={exporting === 'collections-pdf' || loading || !online || !displayCollections}
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'collections-pdf' ? 'Downloading…' : 'PDF'}
              </Button>
              <Button
                onClick={() => exportReport('collections', 'xlsx')}
                disabled={exporting === 'collections-xlsx' || loading || !online || !displayCollections}
                variant="outline"
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'collections-xlsx' ? 'Downloading…' : 'XLSX'}
              </Button>
            </div>

            <FilterNote labels={displayCollections?.filter_labels} />

            {loading ? (
              <ReportSkeleton cards={3} />
            ) : displayCollections ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {collectionSummaryCards.map((card) => (
                    <div key={card.label} className={`rounded-xl border px-4 py-3 shadow-sm ${card.tone}`}>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em]">{card.label}</p>
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
                      <Table stack={false}>
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
                      <Table stack={false}>
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
                      <Table stack={false}>
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
              error ? null : <p className="text-sm text-gray-500 dark:text-gray-400">No collections data.</p>
            )}
          </CardContent>
        </Card>

        <Card data-tour="reports-financial" className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80">
            <CardTitle className="text-slate-900 dark:text-slate-100">Financial Statement</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Subscriber balances, outstanding amounts, and plan-level financial position as of the end of the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => exportReport('statement', 'pdf')}
                disabled={exporting === 'statement-pdf' || loading || !online || !displayStatement}
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'statement-pdf' ? 'Downloading…' : 'PDF'}
              </Button>
              <Button
                onClick={() => exportReport('statement', 'xlsx')}
                disabled={exporting === 'statement-xlsx' || loading || !online || !displayStatement}
                variant="outline"
                className="gap-2"
              >
                <Download className="size-4" />
                {exporting === 'statement-xlsx' ? 'Downloading…' : 'XLSX'}
              </Button>
            </div>

            <FilterNote labels={displayStatement?.filter_labels} />

            {loading ? (
              <ReportSkeleton cards={4} />
            ) : displayStatement ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {statementSummaryCards.map((card) => (
                    <div key={card.label} className={`rounded-xl border px-4 py-3 shadow-sm ${card.tone}`}>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em]">{card.label}</p>
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
                    <Table stack={false}>
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
                    <Table stack={false}>
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
              error ? null : <p className="text-sm text-gray-500 dark:text-gray-400">No financial statement data.</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}