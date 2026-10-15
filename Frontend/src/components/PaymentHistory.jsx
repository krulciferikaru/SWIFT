import { useMemo, useState } from 'react'
import { Ban, Receipt } from 'lucide-react'
import EmptyState from './EmptyState.jsx'
import ReceiptDialog from './ReceiptDialog'
import { Button } from '@/components/ui/button'
import { pesoText } from '../utils/receipt'

const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

/**
 * A subscriber's payments, newest first, with a year filter, a running total and a receipt
 * for each row. `subscriber` is what to print on the receipt: { name, address, contact_number, plan_name }.
 *
 * A cancelled (voided) payment stays in the list, struck through and marked Cancelled with who
 * cancelled it and why, but it is not counted in the total. `onCancelPayment(payment)`, when given,
 * adds a Cancel button to each payment that is still valid (administrators only).
 */
export default function PaymentHistory({ payments, subscriber, maxHeightClass = '', onCancelPayment, limit }) {
  const [year, setYear] = useState('all')
  const [receipt, setReceipt] = useState(null)

  const years = useMemo(
    () => [...new Set(payments.map((p) => new Date(p.payment_date).getFullYear()))].sort((a, b) => b - a),
    [payments],
  )
  // A year that no longer has payments (after a refresh) falls back to showing everything.
  const activeYear = years.includes(Number(year)) ? Number(year) : 'all'
  const shown = activeYear === 'all' ? payments : payments.filter((p) => new Date(p.payment_date).getFullYear() === activeYear)
  // `limit` shows only the newest few (the totals above still count them all).
  const listed = limit ? shown.slice(0, limit) : shown
  const counted = shown.filter((p) => !p.voided_at)
  const total = counted.reduce((sum, p) => sum + Number(p.amount), 0)
  const cancelledCount = shown.length - counted.length

  if (payments.length === 0) {
    return (
      <EmptyState
        compact
        title="No payments yet"
        description="Payments appear here, newest first, after the first one is recorded."
      />
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {counted.length} {counted.length === 1 ? 'payment' : 'payments'} · <strong className="text-gray-900 dark:text-gray-100">{pesoText(total)}</strong> paid
          {cancelledCount > 0 && <span className="text-gray-500 dark:text-gray-400"> · {cancelledCount} cancelled (not counted)</span>}
        </p>
        {years.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            Year
            <select
              value={activeYear}
              onChange={(e) => setYear(e.target.value)}
              className="h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="all">All</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <ul className={`divide-y divide-gray-100 dark:divide-gray-800 overflow-y-auto ${maxHeightClass}`}>
        {listed.map((p) => {
          const cancelled = Boolean(p.voided_at)
          return (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className={`font-medium ${cancelled ? 'text-gray-500 line-through dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                  {pesoText(p.amount)}
                  {cancelled && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 align-middle text-xs font-semibold text-red-700 no-underline dark:bg-red-950 dark:text-red-300">
                      <Ban className="size-3" aria-hidden="true" />
                      Cancelled
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {shortDate(p.payment_date)} · {p.or_number} · {p.payment_method}
                </p>
                {cancelled && (
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Cancelled {shortDate(p.voided_at)}{p.voided_by_name ? ` by ${p.voided_by_name}` : ''}: {p.void_reason}
                  </p>
                )}
              </div>
              {!cancelled && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setReceipt({ payment: p, subscriber })}
                    aria-label={`View receipt ${p.or_number}`}
                  >
                    <Receipt className="size-3.5" />
                    Receipt
                  </Button>
                  {onCancelPayment && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                      onClick={() => onCancelPayment(p)}
                      aria-label={`Cancel payment ${p.or_number}`}
                    >
                      <Ban className="size-3.5" aria-hidden="true" />
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <ReceiptDialog data={receipt} onClose={() => setReceipt(null)} />
    </div>
  )
}
