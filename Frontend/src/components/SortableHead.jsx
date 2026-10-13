import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'

/**
 * A column heading that can be clicked to sort. It shows that it is sortable (a faint up-down
 * arrow), which column is sorted and in which direction (an arrow), and tells screen readers the
 * same through aria-sort.
 *
 *   <SortableHead column="name" sort={view.sort} dir={view.dir} onSort={changeSort}>Name</SortableHead>
 */
export default function SortableHead({ column, sort, dir, onSort, children, className = '' }) {
  const active = sort === column
  const Icon = !active ? ArrowUpDown : dir === 'desc' ? ArrowDown : ArrowUp

  return (
    <TableHead
      aria-sort={active ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        title={`Sort by ${typeof children === 'string' ? children.toLowerCase() : 'this column'}`}
        className="group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-primary dark:hover:bg-gray-800"
      >
        {children}
        <Icon
          className={`size-3.5 shrink-0 ${active ? 'text-primary dark:text-blue-300' : 'text-gray-400 opacity-60 group-hover:opacity-100'}`}
          aria-hidden="true"
        />
      </button>
    </TableHead>
  )
}

/**
 * The usual sort click: a new column sorts ascending, the same column again flips to descending,
 * and a third click goes back to the page's default order. The default column itself simply
 * toggles between the two directions.
 */
export function nextSort({ sort, dir }, column, defaults = { sort: 'name', dir: 'asc' }) {
  if (sort !== column) return { sort: column, dir: 'asc', page: 1 }
  if (dir === 'asc') return { sort: column, dir: 'desc', page: 1 }
  if (column === defaults.sort) return { sort: column, dir: 'asc', page: 1 }
  return { sort: defaults.sort, dir: defaults.dir, page: 1 }
}
