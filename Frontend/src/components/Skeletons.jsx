import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Loading placeholders that mirror the real layouts, so nothing jumps when the data arrives.
// Every group announces itself once to screen readers instead of reading each grey bar.

/** Wraps a set of placeholders: one "Loading" announcement, hidden bars. */
export function LoadingStatus({ children, className = '', label = 'Loading…', heading }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      {heading && <h1 className="sr-only">{heading}</h1>}
      <span className="sr-only">{label}</span>
      <div inert>{children}</div>
    </div>
  )
}

const WIDTHS = ['w-28', 'w-36', 'w-24', 'w-32', 'w-20', 'w-40']

/**
 * A table of grey bars under the REAL column titles. Because the titles are real, on a phone each
 * placeholder row turns into a card with the right labels, exactly like the loaded table.
 * columns: [{ label, kind?: 'text' | 'badge' | 'actions' }]
 */
export function TableSkeleton({ columns, rows = 6 }) {
  return (
    <LoadingStatus>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.label}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r}>
              {columns.map((c, i) => (
                <TableCell key={c.label}>
                  {c.kind === 'badge' ? (
                    <Skeleton className="h-5 w-16 rounded-full" />
                  ) : c.kind === 'actions' ? (
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ) : (
                    <Skeleton className={`h-4 ${WIDTHS[(r + i) % WIDTHS.length]}`} />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LoadingStatus>
  )
}

/** A page title with an optional action button on the right. */
export function PageHeaderSkeleton({ action = false, subtitle = true }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        {subtitle && <Skeleton className="h-4 w-72 max-w-full" />}
      </div>
      {action && <Skeleton className="h-9 w-28" />}
    </div>
  )
}

/** A row of small stat cards (label, number). */
export function StatCardsSkeleton({ count = 3, className = '' }) {
  return (
    <div className={`grid gap-4 ${className || 'grid-cols-1 sm:grid-cols-3'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** A titled card holding a few lines, for lists and breakdowns. */
export function CardListSkeleton({ rows = 4, className = '' }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** A filter row: a wide search box and a few selects. */
export function ToolbarSkeleton({ selects = 1 }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
      <Skeleton className="h-9 flex-1" />
      {Array.from({ length: selects }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full sm:w-40" />
      ))}
    </div>
  )
}

/** The white rounded panel the real tables sit in. */
export function TablePanel({ children }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {children}
    </div>
  )
}

/** Summary cards and a table block, for the report previews. */
export function ReportSkeleton({ cards = 3 }) {
  return (
    <LoadingStatus label="Loading report…" className="space-y-4">
      <div className={`grid gap-3 ${cards === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </LoadingStatus>
  )
}
