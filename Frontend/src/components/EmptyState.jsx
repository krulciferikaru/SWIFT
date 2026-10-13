import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'

/**
 * What a list shows when it has nothing to show. It says what the area is for, why it is
 * empty, and what to do next. There are two different reasons for emptiness and they need
 * different words:
 *   - nothing has been added yet  -> explain the purpose, offer the first step (`action`)
 *   - the filters match nothing   -> say so, offer to clear them (`onClearFilters`)
 *
 * Props:
 *   icon            a lucide icon component (optional)
 *   title           one short line: what is missing
 *   description     one or two sentences: why, and what to do
 *   action          { label, onClick } or { label, to } : the main next step (optional)
 *   onClearFilters  shows a "Clear filters" button when the list is empty because of filters
 *   compact         smaller padding, for use inside a card or a dropdown
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onClearFilters,
  compact = false,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-14'} ${className}`}
    >
      {Icon && (
        <span className="flex size-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
      <div className="max-w-md space-y-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
        {description && <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>}
      </div>
      {(action || onClearFilters) && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {action &&
            (action.to ? (
              <Link to={action.to} className={buttonVariants()}>{action.label}</Link>
            ) : (
              <Button type="button" onClick={action.onClick}>{action.label}</Button>
            ))}
          {onClearFilters && (
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
