import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

/**
 * Both themes shown side by side, the current one highlighted, so nobody has to guess what a single
 * sun or moon icon will do. It is a pair of radio buttons: use the arrow keys or click to choose.
 */
export default function ThemeSwitch({ className = '' }) {
  const { theme, setTheme } = useTheme()

  const onKeyDown = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      onKeyDown={onKeyDown}
      className={`grid grid-cols-2 gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-900 ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => setTheme(value)}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              selected
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
