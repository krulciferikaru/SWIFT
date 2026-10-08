import { CheckCircle2, AlertTriangle, PowerOff } from 'lucide-react'

const peso = (value) => `₱${Number(value ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

const longDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const LOOKS = {
  ok: {
    box: 'border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/40',
    title: 'text-green-900 dark:text-green-300',
    text: 'text-green-900 dark:text-green-200',
    icon: 'text-green-700 dark:text-green-400',
    Icon: CheckCircle2,
  },
  warn: {
    box: 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
    title: 'text-amber-900 dark:text-amber-300',
    text: 'text-amber-900 dark:text-amber-200',
    icon: 'text-amber-700 dark:text-amber-400',
    Icon: AlertTriangle,
  },
  stop: {
    box: 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40',
    title: 'text-red-900 dark:text-red-300',
    text: 'text-red-900 dark:text-red-200',
    icon: 'text-red-700 dark:text-red-400',
    Icon: PowerOff,
  },
}

/** What state the account is in, in plain words, and what to do about it. */
function describe(b) {
  const owe = peso(b.balance)
  const unpaid = plural(b.months_behind, 'unpaid month')

  if (b.status === 'Disconnected') {
    return {
      look: 'stop',
      title: 'Your service is disconnected',
      lines: [
        `You owe ${owe} (${unpaid}).`,
        'To use your service again, pay your balance, then contact the company so it can be reconnected.',
      ],
    }
  }

  if (b.status === 'Unpaid' || b.months_behind > 0) {
    return {
      look: 'warn',
      title: 'Payment needed',
      lines: [
        `You owe ${owe} (${unpaid}).`,
        b.months_behind >= 2
          ? 'Please pay now. If 3 months go unpaid, your service is disconnected.'
          : 'Please pay soon. If 3 months go unpaid, your service is disconnected.',
      ],
    }
  }

  const lines = ['You do not owe anything right now.']
  if (b.advance_credit > 0) lines.push(`You have ${peso(b.advance_credit)} paid in advance.`)
  if (b.next_due_date) lines.push(`Your next bill is due on ${longDate(b.next_due_date)}.`)
  return { look: 'ok', title: 'Your service is active', lines }
}

export default function AccountStatusBanner({ billing }) {
  const { look, title, lines } = describe(billing)
  const c = LOOKS[look]

  return (
    <section
      data-tour="me-status"
      aria-label="Your account status"
      className={`flex items-start gap-4 rounded-lg border-2 p-4 sm:p-5 ${c.box}`}
    >
      <c.Icon className={`mt-0.5 size-8 shrink-0 ${c.icon}`} aria-hidden="true" />
      <div className="space-y-1">
        <h2 className={`text-xl font-bold ${c.title}`}>{title}</h2>
        {lines.map((line) => (
          <p key={line} className={`text-base ${c.text}`}>{line}</p>
        ))}
        {look !== 'ok' && billing.next_due_date && (
          <p className={`text-base ${c.text}`}>Your bill is due on the {billing.due_day}{ordinal(billing.due_day)} of every month.</p>
        )}
      </div>
    </section>
  )
}

function ordinal(n) {
  const v = n % 100
  if (v >= 11 && v <= 13) return 'th'
  return { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'
}
