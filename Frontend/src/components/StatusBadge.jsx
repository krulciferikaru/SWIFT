import { Badge } from '@/components/ui/badge'

const STATUS_STYLES = {
  Active: 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200',
  Unpaid: 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200',
  Disconnected: 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200',
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200'

  return (
    <Badge variant="outline" className={style}>
      {status}
    </Badge>
  )
}