import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'

/**
 * A card that can be clicked, made obvious in the ways people look for:
 *  - a written hint at the bottom ("View unpaid subscribers") with an arrow, always visible, so it
 *    works on a phone where there is no hover;
 *  - a hover lift (border and shadow) and a pointer cursor on a computer;
 *  - a clear focus ring for keyboard users;
 *  - the whole card is one link or one button, so nothing inside it competes for the click.
 *
 * Give it `to` to go to another page, or `onClick` to act on the current one (a filter), in which
 * case `pressed` says whether that filter is on. Without either it renders as a plain card, so a
 * card that cannot be clicked never carries the hint.
 */
export default function CardAction({
  to,
  state,
  onClick,
  pressed,
  hint,
  className = '',
  children,
}) {
  const interactive = Boolean(to || onClick)

  if (!interactive) {
    return <Card className={className}>{children}</Card>
  }

  const wrapperClass =
    'group block w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

  const body = (
    <Card
      className={`h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-primary/50 ${
        pressed ? 'ring-2 ring-primary' : ''
      } ${className}`}
    >
      {children}
      <div className="mx-(--card-spacing) flex items-center justify-between gap-2 border-t border-gray-200 pt-2 text-xs font-medium text-primary dark:border-gray-700 dark:text-blue-300">
        <span>{hint}</span>
        {pressed ? (
          <Check className="size-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        )}
      </div>
    </Card>
  )

  if (to) {
    return (
      <Link to={to} state={state} className={wrapperClass}>
        {body}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} className={wrapperClass}>
      {body}
    </button>
  )
}
