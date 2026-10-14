import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'

/**
 * Pick a barangay from the admin's list by typing to search it. The city is not chosen: it is always the same
 * (Palayan City) and shown beside it.
 *
 *   <BarangayPicker id="barangay" value={form.barangay} onChange={(name) => ...} options={barangays} />
 *
 * Works inside FormField (it takes the id, aria-invalid and aria-describedby from there). Keyboard: type to
 * filter, Up and Down to move, Enter to choose, Escape to close.
 */
export default function BarangayPicker({
  id,
  value = '',
  onChange,
  onBlur,
  options = [],
  placeholder = 'Search or choose a barangay',
  disabled = false,
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
}) {
  const listId = useId()
  const wrapper = useRef(null)
  const input = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  // A barangay the admin has since switched off (still on this person's record) stays shown and chosen.
  const all = useMemo(() => (value && !options.includes(value) ? [value, ...options] : options), [options, value])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? all.filter((name) => name.toLowerCase().includes(q)) : all
  }, [all, query])

  useEffect(() => setActive(0), [query, open])

  // Click outside closes it.
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (wrapper.current && !wrapper.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const choose = (name) => {
    onChange(name)
    setOpen(false)
    setQuery('')
    input.current?.focus()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      else setActive((i) => Math.min(shown.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && open) {
      e.preventDefault()
      if (shown[active]) choose(shown[active])
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      e.stopPropagation() // do not also close a window this sits in
      setOpen(false)
      setQuery('')
    }
  }

  const activeId = open && shown[active] ? `${listId}-opt-${active}` : undefined

  return (
    <div ref={wrapper} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            ref={input}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={describedBy}
            autoComplete="off"
            disabled={disabled}
            value={open ? query : value}
            placeholder={placeholder}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            className={`h-9 w-full rounded-md border bg-transparent pl-8 pr-8 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-gray-950 ${invalid ? 'border-red-400' : 'border-input'}`}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? 'Close the list of barangays' : 'Show the list of barangays'}
            onClick={() => { setOpen((o) => !o); input.current?.focus() }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <ChevronsUpDown className="size-4" aria-hidden="true" />
          </button>
        </div>
        <span className="shrink-0 rounded-md border border-input bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-400" title="The city is always Palayan City">
          Palayan City
        </span>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white p-1 text-sm shadow-md dark:border-gray-700 dark:bg-gray-900"
        >
          {shown.length === 0 ? (
            <li className="px-3 py-2 text-gray-600 dark:text-gray-400">No barangay matches &quot;{query}&quot;.</li>
          ) : (
            shown.map((name, i) => (
              <li
                key={name}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={name === value}
                onMouseDown={(e) => { e.preventDefault(); choose(name) }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between rounded px-3 py-2 ${i === active ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              >
                {name}
                {name === value && <Check className="size-4 text-primary" aria-hidden="true" />}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
