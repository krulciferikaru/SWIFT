import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import subscriberApi from '../api/subscribers'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/**
 * Search for one subscriber by name, mobile number or MAC address and pick them.
 * `value` is { id, name } or null; `onChange` gets the same shape.
 */
export default function SubscriberPicker({ value, onChange, id = 'subscriber-picker' }) {
  const [text, setText] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const term = text.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    let alive = true
    setSearching(true)
    const t = setTimeout(() => {
      subscriberApi
        .getAll({ search: term, per_page: 6 })
        .then((res) => {
          if (!alive) return
          const data = res.data.data
          setResults(Array.isArray(data) ? data : (data?.data ?? []))
        })
        .catch(() => alive && setResults([]))
        .finally(() => alive && setSearching(false))
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [text])

  if (value) {
    return (
      <div className="flex h-9 items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900">
        <span className="truncate font-medium text-gray-900 dark:text-gray-100">{value.name}</span>
        <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-1.5" onClick={() => onChange(null)} aria-label={`Clear subscriber ${value.name}`}>
          <X className="size-3.5" aria-hidden="true" /> Clear
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search by name or number…"
        autoComplete="off"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={`${id}-results`}
      />
      {text.trim().length >= 2 && (
        <ul
          id={`${id}-results`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {searching ? (
            <li className="p-2 text-sm text-gray-600 dark:text-gray-400">Searching…</li>
          ) : results.length === 0 ? (
            <li className="p-2 text-sm text-gray-600 dark:text-gray-400">No subscribers found.</li>
          ) : (
            results.map((s) => (
              <li key={s.subscriber_id} role="option" aria-selected="false">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => {
                    onChange({ id: s.subscriber_id, name: s.name })
                    setText('')
                  }}
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">{s.name}</span>
                  <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">{s.contact_number}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
