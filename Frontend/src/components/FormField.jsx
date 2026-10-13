import { Children, cloneElement, isValidElement } from 'react'
import { CircleAlert } from 'lucide-react'
import { Label } from '@/components/ui/label'

/**
 * One form field done the same way everywhere: the label (with an asterisk when required, and
 * "(required)" for a screen reader), the input, an optional hint, and the error under it.
 *
 * The input is passed as the child. FormField gives it the id, marks it invalid and links the
 * hint and error to it, so a screen reader reads them with the field. The error also starts with
 * the word "Error", so it never depends on colour alone.
 *
 *   <FormField id="amount" label="Amount" required hint="In pesos" error={errors.amount}>
 *     <Input name="amount" value={...} onChange={...} onBlur={...} />
 *   </FormField>
 */
export default function FormField({ id, label, required = false, optional = false, hint, error, className = '', children }) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const control = Children.map(children, (child) =>
    isValidElement(child)
      ? cloneElement(child, {
          id,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': describedBy,
          className: `${child.props.className ?? ''} ${error ? 'border-red-400' : ''}`.trim(),
        })
      : child,
  )

  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="ml-0.5 text-red-500">*</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
        {optional && <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">(optional)</span>}
      </Label>
      {control}
      {hint && (
        <p id={hintId} className="text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} aria-live="polite" className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">Error: </span>
            {error}
          </span>
        </p>
      )}
    </div>
  )
}

/** "* required" legend for the top of a form. */
export function RequiredNote() {
  return (
    <p className="text-xs text-gray-500 dark:text-gray-400">
      <span aria-hidden="true" className="text-red-500">*</span> Required
    </p>
  )
}
