import { useSyncExternalStore } from 'react'
import { TEXT_SIZES, getTextSize, setTextSize, subscribeTextSize } from '../utils/textSize'

/** Three buttons that make all text in SWIFT bigger. The choice is remembered on this device. */
export default function TextSizeControl({ className = '' }) {
  const current = useSyncExternalStore(subscribeTextSize, getTextSize)

  return (
    <div
      data-tour="text-size"
      role="group"
      aria-label="Text size"
      className={`inline-flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 ${className}`}
    >
      {TEXT_SIZES.map((size, i) => (
        <button
          key={size.key}
          type="button"
          aria-pressed={current === size.key}
          aria-label={`${size.label} text`}
          title={`${size.label} text`}
          onClick={() => setTextSize(size.key)}
          className={`min-w-10 rounded-md px-2.5 py-1 font-semibold leading-none transition-colors ${
            current === size.key
              ? 'bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          style={{ fontSize: `${0.8 + i * 0.2}rem` }}
        >
          A
        </button>
      ))}
    </div>
  )
}
