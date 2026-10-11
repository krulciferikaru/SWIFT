import { useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import ReceiptDialog from './ReceiptDialog'
import { Button } from '@/components/ui/button'
import { pesoText } from '../utils/receipt'

const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

/**
 * A subscriber's payments, newest first, with a year filter, a running total and a receipt
 * for each row. `subscriber` is what to print on the receipt: { name, address, contact_number, plan_name }.
 */
export default function PaymentHistory({ payments, subscriber, maxHeightClass = '' }) {
  const [year, setYear] = useState('all')
  const [receipt, setReceipt] = useState(null)

  const years = useMemo(
    () => [...new Set(payments.map((p) => new Date(p.payment_date).getFullYear()))].sort((a, b) => b - a),
    [payments],
  )
  // A year that no longer has payments (after a refresh) falls back to showing everything.
  const activeYear = years.includes(Number(year)) ? Number(year) : 'all'
  const shown = activeYear === 'all' ? payments : payments.filter((p) => new Date(p.payment_date).getFullYear() === activeYear)
  const total = shown.reduce((sum, p) => sum + Number(p.amount), 0)

  if (payments.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No payments recorded yet.</p>
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {shown.length} {shown.length === 1 ? 'payment' : 'payments'} · <strong className="text-gray-900 dark:text-gray-100">{pesoText(total)}</strong> paid
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
        {shown.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100">{pesoText(p.amount)}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {shortDate(p.payment_date)} · {p.or_number} · {p.payment_method}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setReceipt({ payment: p, subscriber })}
              aria-label={`View receipt ${p.or_number}`}
            >
              <Receipt className="size-3.5" />
              Receipt
            </Button>
          </li>
        ))}
      </ul>

      <ReceiptDialog data={receipt} onClose={() => setReceipt(null)} />
    </div>
  )
}
