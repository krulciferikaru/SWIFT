import { useRef } from 'react'

/**
 * A one-time code typed into separate boxes, one digit each, like the sign-in codes people know.
 * It moves on by itself as digits are typed, goes back on Backspace, accepts a pasted code (and the
 * code a phone offers to fill in) and only lets digits through.
 *
 *   <CodeInput value={code} onChange={setCode} />
 *
 * Works inside FormField: it takes the id (given to the first box, so the label points at it),
 * aria-invalid and aria-describedby from there. `onComplete(code)` runs when the last box is filled.
 */
export default function CodeInput({
  value = '',
  onChange,
  onComplete,
  length = 6,
  id,
  disabled = false,
  autoFocus = false,
  className = '',
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
}) {
  const boxes = useRef([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const focusBox = (i) => {
    const box = boxes.current[Math.max(0, Math.min(length - 1, i))]
    if (box) {
      box.focus()
      box.select()
    }
  }

  // Put digits in from box `start` on, then move to the box after the last one filled.
  const fill = (start, incoming) => {
    const clean = incoming.replace(/\D/g, '')
    if (!clean) return
    const next = digits.slice()
    let i = start
    for (const ch of clean) {
      if (i >= length) break
      next[i] = ch
      i += 1
    }
    const joined = next.join('')
    onChange(joined)
    if (joined.length === length && !next.includes('')) onComplete?.(joined)
    focusBox(i)
  }

  const onInput = (i, e) => {
    const typed = e.target.value
    if (typed === '') {
      const next = digits.slice()
      next[i] = ''
      onChange(next.join('').trimEnd())
      return
    }
    fill(i, typed)
  }

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) return // the box's own digit is removed by the change event
      e.preventDefault()
      if (i > 0) {
        const next = digits.slice()
        next[i - 1] = ''
        onChange(next.join('').trimEnd())
        focusBox(i - 1)
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusBox(i - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusBox(i + 1)
    }
  }

  const onPaste = (i, e) => {
    e.preventDefault()
    fill(i, e.clipboardData.getData('text'))
  }

  return (
    <div role="group" aria-label={`${length}-digit code`} aria-describedby={describedBy} className={`flex gap-2 ${className}`}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { boxes.current[i] = el }}
          id={i === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          // The phone's "fill in the code" offer goes to the first box, which then spreads it across.
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? length : 1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid ? true : undefined}
          onChange={(e) => onInput(i, e)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={(e) => onPaste(i, e)}
          onFocus={(e) => e.target.select()}
          className={`h-12 w-full min-w-0 max-w-12 rounded-md border bg-transparent text-center font-mono text-xl outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-gray-950 ${
            invalid ? 'border-red-400' : digit ? 'border-primary/60' : 'border-input'
          }`}
        />
      ))}
    </div>
  )
}
