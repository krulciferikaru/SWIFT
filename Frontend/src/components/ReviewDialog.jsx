import { TriangleAlert } from 'lucide-react'
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

/**
 * "Check this before it is saved": lists what was typed so a slip (an extra zero in an amount,
 * the wrong date) is caught before it becomes a record. Used for payments and plan rates.
 *
 * rows: [{ label, value, emphasis }]; warning: optional sentence shown in amber.
 */
export default function ReviewDialog({
  open,
  onOpenChange,
  title,
  description,
  rows,
  warning,
  confirmLabel = 'Confirm',
  busyLabel = 'Saving...',
  busy = false,
  onConfirm,
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="divide-y divide-gray-200 dark:divide-gray-700 rounded-md border border-gray-200 dark:border-gray-700 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 px-3 py-2">
              <dt className="text-gray-500 dark:text-gray-400">{row.label}</dt>
              <dd
                className={`text-right ${
                  row.emphasis
                    ? 'text-xl font-bold text-gray-900 dark:text-gray-100'
                    : 'font-medium text-gray-900 dark:text-gray-100'
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {warning && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{warning}</span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Go back and edit</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
