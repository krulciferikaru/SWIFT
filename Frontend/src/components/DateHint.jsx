import { spelledDate } from '../utils/text'

/**
 * The chosen date spelled out ("October 14, 2026") under a date box. The browser's date box shows
 * month/day/year in some places and day/month/year in others, so the words remove any doubt.
 * Shows nothing until a date is picked.
 */
export default function DateHint({ value, className = '' }) {
  const text = spelledDate(value)
  if (!text) return null
  return <p className={`text-xs text-gray-500 dark:text-gray-400 ${className}`}>{text}</p>
}
