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
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={busy}
            className={destructive ? 'bg-red-600 hover:bg-red-700' : undefined}
          >
            {busy ? busyLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
