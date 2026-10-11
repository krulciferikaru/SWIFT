import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'

/**
 * A password box with a "Show" / "Hide" button that says what it does in words, not just an eye.
 * Pass the same props you would give an Input (id, name, value, onChange, required, ...).
 */
export default function PasswordField({ className = '', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={`pr-20 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
