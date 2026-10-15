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
 * "Are you sure?" for archiving and restoring. It names what is affected and what will happen,
 * so the person is deciding with the facts in front of them.
 *
 *   <ConfirmAction
 *     open={!!target}
 *     onOpenChange={(open) => !open && setTarget(null)}
 *     title="Archive this subscriber?"
 *     description={<>...</>}
 *     confirmLabel="Archive"
 *     destructive
 *     onConfirm={...}
 *   />
 */
export default function ConfirmAction({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busyLabel = 'Working...',
  destructive = false,
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
        <AlertDialogFooter>
          {destructive ? (
            // A destructive action: the risky button is the plain one, the safe way out is the filled one.
            <>
              <AlertDialogAction variant="outline" onClick={onConfirm} disabled={busy} className="border-red-300 bg-transparent text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
                {busy ? busyLabel : confirmLabel}
              </AlertDialogAction>
              <AlertDialogCancel variant="default" disabled={busy}>Cancel</AlertDialogCancel>
            </>
          ) : (
            <>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm} disabled={busy}>
                {busy ? busyLabel : confirmLabel}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
