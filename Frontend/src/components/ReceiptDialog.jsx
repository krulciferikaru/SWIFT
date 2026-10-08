import { Printer } from 'lucide-react'
import Modal from './Modal'
import DetailField from './DetailField'
import { Button } from '@/components/ui/button'
import { COMPANY_NAME, COMPANY_BRANCH, pesoText, printReceipt, receiptRows } from '../utils/receipt'

/** On-screen preview of a payment receipt with a Print button. `data` = { payment, subscriber }. */
export default function ReceiptDialog({ data, onClose }) {
  const payment = data?.payment

  return (
    <Modal
      isOpen={!!data}
      onClose={onClose}
      title={payment ? `Receipt ${payment.or_number}` : 'Receipt'}
      description="Payment receipt"
      size="md"
      footer={(requestClose) => (
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={requestClose}>
            Close
          </Button>
          <Button type="button" className="gap-1.5" onClick={() => printReceipt(data)}>
            <Printer className="size-4" />
            Print receipt
          </Button>
        </div>
      )}
    >
      {payment && (
        <div className="space-y-5">
          <div className="text-center">
            <p className="font-semibold text-gray-900 dark:text-gray-100">{COMPANY_NAME}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{COMPANY_BRANCH}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Amount received</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{pesoText(payment.amount)}</p>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailField label="Receipt / OR No.">{payment.or_number}</DetailField>
            {receiptRows(data).map(([label, value]) => (
              <DetailField key={label} label={label}>{value}</DetailField>
            ))}
          </dl>
        </div>
      )}
    </Modal>
  )
}
