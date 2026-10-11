// One label and value pair for the details dialogs. Use inside a <dl>.
export default function DetailField({ label, children, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100 break-words">
        {children || children === 0 ? children : '—'}
      </dd>
    </div>
  )
}

export const peso = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

export const longDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : null
