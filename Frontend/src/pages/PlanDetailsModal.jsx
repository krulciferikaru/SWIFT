import { useRef } from 'react'
import { Pencil } from 'lucide-react'
import Modal from '../components/Modal'
import DetailField, { peso } from '../components/DetailField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function PlanDetailsModal({ plan: current, canArchive, onClose, onEdit, onArchive }) {
  // Keep showing the last plan while the dialog fades out, so it does not go blank.
  const lastPlan = useRef(null)
  if (current) lastPlan.current = current
  const plan = current ?? lastPlan.current

  return (
    <Modal
      isOpen={!!current}
      onClose={onClose}
      title={plan?.plan_name ?? 'Service plan'}
      description="Service plan details"
      size="md"
      footer={(requestClose) => (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {canArchive ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onArchive(plan)}
              aria-label={`Archive ${plan?.plan_name}`}
            >
              Archive
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={requestClose}>
              Close
            </Button>
            <Button type="button" className="gap-1.5" onClick={() => onEdit(plan)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          </div>
        </div>
      )}
    >
      {plan && (
        <div className="space-y-5">
          <Badge
            variant="outline"
            className={
              plan.status === 'Active'
                ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }
          >
            {plan.status}
          </Badge>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailField label="Monthly rate">{peso(plan.monthly_rate)}</DetailField>
            <DetailField label="Speed">{plan.speed_mbps ? `${plan.speed_mbps} Mbps` : null}</DetailField>
            <DetailField label="Description" className="sm:col-span-2">
              <span className="whitespace-pre-wrap">{plan.description}</span>
            </DetailField>
          </dl>
        </div>
      )}
    </Modal>
  )
}
