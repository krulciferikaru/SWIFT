import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const PAGE_SIZES = [15, 25, 50, 100]

// 1 … 4 5 [6] 7 8 … 20 : the first, the last, and the neighbours of the current page.
function pageList(current, last) {
  const pages = new Set([1, last, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b)
  const out = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap-' + p)
    out.push(p)
  })
  return out
}

/**
 * The footer under a table: how many are shown, a choice of page size, and the pages.
 *
 * meta is the paginator the server returns (from, to, total, last_page).
 * Without `onPerPage` the page-size choice is left out.
 */
export default function Pager({ meta, page, onPage, perPage, onPerPage, noun = 'items', sizes = PAGE_SIZES }) {
  if (!meta || meta.total === 0) return null
  const last = meta.last_page ?? 1
  const showSizes = Boolean(onPerPage) && meta.total > sizes[0]
  if (last <= 1 && !showSizes) {
    return <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Showing all {meta.total} {noun}</p>
  }

  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
      <span aria-live="polite">
        Showing {meta.from}–{meta.to} of {meta.total} {noun}
      </span>

      <div className="flex flex-wrap items-center gap-3">
        {showSizes && (
          <label className="flex items-center gap-2">
            <span>Per page</span>
            <select
              value={perPage}
              onChange={(e) => onPerPage(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm dark:bg-gray-950"
            >
              {sizes.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}

        {last > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className="gap-1">
              <ChevronLeft className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            {pageList(page, last).map((p) =>
              typeof p === 'string' ? (
                <span key={p} aria-hidden="true" className="px-1">…</span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                  className="min-w-8 px-2"
                >
                  {p}
                </Button>
              ),
            )}
            <Button variant="outline" size="sm" onClick={() => onPage(page + 1)} disabled={page >= last} aria-label="Next page" className="gap-1">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
