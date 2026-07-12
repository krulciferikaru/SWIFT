import { Badge } from '@/components/ui/badge'

const STATUS_STYLES = {
  Active: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950 border-green-200 dark:border-green-900',
  Unpaid: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950 border-amber-200 dark:border-amber-900',
  Disconnected: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950 border-red-200 dark:border-red-900',
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'

  return (
    <Badge variant="outline" className={style}>
      {status}
    </Badge>
  )
}