import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Shown above pages that are opened from Settings (Guide, Manage Roles), so there is a way back. */
export default function BackToSettings({ className = '' }) {
  return (
    <Link
      to="/settings"
      className={`inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline print:hidden ${className}`}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to Settings
    </Link>
  )
}
