import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '../context/AuthContext'
import { TOUR_PAGES } from '../tour/tours'
import {
  PlayCircle,
  Search,
  X,
  LayoutDashboard,
  Users2,
  ClipboardCheck,
  Wifi,
  Wallet,
  FileText,
  Archive,
  ShieldCheck,
  Settings as SettingsIcon,
  KeyRound,
  Info,
} from 'lucide-react'

// A scrollable reference page that reads fine on a phone and can be printed.
// Sections with an interactive tour get a "Show me" button that opens that
// page with its tour running.
const SECTIONS = [
  {
    id: 'dashboard',
    tour: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    summary: 'Your home screen — a quick snapshot when you log in.',
    body: (
      <>
        <p>Shows an overview of subscriber counts and recent activity at a glance. There's nothing to configure here — it's just a starting point. Use the sidebar on the left to go to the feature you need.</p>
      </>
    ),
  },
  {
    id: 'subscribers',
    tour: 'subscribers',
    icon: Users2,
    title: 'Subscribers',
    summary: 'The full list of cable TV/internet subscribers.',
    roles: ['admin', 'secretary'],
    body: (
      <>
        <p>This is the master list of everyone signed up for service. At the top you'll see totals for Total, Pending, Active, Unpaid, and Disconnected.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Search box</strong> — type a name, contact number, or MAC address to filter the list. You don't need to press Enter, it filters as you type.</li>
          <li><strong>Status dropdown</strong> — narrow the list to only Active, Unpaid, or Disconnected subscribers.</li>
          <li><strong>Add Subscriber</strong> — opens a form to manually register a new subscriber (name, plan, contact info, etc.).</li>
          <li><strong>Edit</strong> (per row) — update a subscriber's details, like their assigned plan or contact number.</li>
          <li><strong>Archive</strong> (per row) — moves the subscriber to the Archive page and suspends their login. Nothing is lost; you can restore them anytime.</li>
          <li><strong>Payments</strong> (per row) — jumps straight to that subscriber's billing page (see the Payments section below).</li>
          <li><strong>Export CSV</strong> — downloads the current filtered list as a spreadsheet file.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'approvals',
    tour: 'approvals',
    icon: ClipboardCheck,
    title: 'Pending Approvals',
    summary: 'Review new subscriber sign-ups before they become active.',
    roles: ['admin', 'secretary'],
    body: (
      <>
        <p>When someone registers themselves through the subscriber sign-up page, their application lands here first — they can't log in until you approve them. A red number badge on the sidebar tells you how many are waiting.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Pending tab</strong> — new applications. Click <em>Approve</em> to activate them, or <em>Reject</em> if the application looks wrong or fraudulent.</li>
          <li><strong>Rejected tab</strong> — applications you previously rejected. You can re-approve from here if it turns out to be a mistake.</li>
          <li><strong>Account Claims tab</strong> — this is different from a new sign-up. It happens when someone registers using a contact number that matches an <em>existing</em> subscriber already on file (for example, an old subscriber who never had a login before). Always double-check the name, address, and contact number shown against what you have on file before approving a claim — approving it links that login to the existing subscriber's record and billing history.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'plans',
    tour: 'plans',
    icon: Wifi,
    title: 'Service Plans',
    summary: 'The internet/cable packages you offer, and their monthly rates.',
    roles: ['admin', 'secretary'],
    body: (
      <>
        <p>This is where the actual plans (e.g. "Basic Internet", "Home Plus") and their monthly prices live. Every subscriber gets assigned one of these.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Add Plan</strong> — create a new plan with a name, monthly rate, speed, and description.</li>
          <li><strong>Edit</strong> — change a plan's price or details. This affects future billing, not past payments.</li>
          <li><strong>Archive</strong> — hides the plan from new subscriber assignments. Subscribers already on it keep it and are billed as usual. Restore it from the Archive page.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'payments',
    tour: 'payments',
    icon: Wallet,
    title: 'Payments',
    summary: 'Record a subscriber\'s payment and see their balance.',
    roles: ['admin', 'secretary'],
    body: (
      <>
        <p>This is where you'll spend the most time day-to-day.</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Search for the subscriber by name, contact number, or MAC address.</li>
          <li>Click their name — you'll see their current <strong>balance due</strong>, a <strong>Billing Breakdown</strong> (which months are paid/unpaid), and their <strong>Recent Payments</strong> history.</li>
          <li>Fill in the <strong>Record Payment</strong> form: amount, OR (official receipt) number, date, and payment method (Cash, GCash, or Others). As you type an amount, it shows you a live preview of which month(s) that payment will cover.</li>
          <li>Click <strong>Record Payment</strong> to save it.</li>
        </ol>
        <p>If a subscriber was disconnected for non-payment and has now fully paid off their balance, a <strong>Reconnect Subscriber</strong> button appears — use it only after you've physically reconnected their service, not before.</p>
      </>
    ),
  },
  {
    id: 'reports',
    tour: 'reports',
    icon: FileText,
    title: 'Reports',
    summary: 'Collection totals and financial statements by month, last 3 months, or year — exportable to PDF/Excel.',
    roles: ['admin', 'secretary'],
    body: (
      <>
        <p>Choose <strong>Monthly</strong> (pick a month), <strong>Last 3 Months</strong> (the past three months up to today), or <strong>Annual</strong> (pick a year) at the top, then review:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Collection Report</strong> — how much was collected in the selected period, broken down by plan and by payment method, plus a full payment ledger.</li>
          <li><strong>Financial Statement</strong> — who owes what: total receivables, paid, and outstanding balances, broken down by plan and per-subscriber.</li>
        </ul>
        <p>Each report has <strong>PDF</strong> and <strong>XLSX</strong> (Excel) download buttons if you need to print or send it somewhere.</p>
      </>
    ),
  },
  {
    id: 'archive',
    icon: Archive,
    title: 'Archive',
    summary: 'Archived subscribers and plans — restore them or delete them for good.',
    roles: ['admin', 'secretary'],
    body: (
      <>
        <p>Subscribers and plans are never deleted straight from their own pages. <strong>Archive</strong> moves them here instead.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Restore</strong> — puts the record back where it was.</li>
          <li><strong>Delete</strong> — permanently removes it. For a subscriber this also deletes their payment history and login, so only do this when you are sure. A plan that is still assigned to any subscriber cannot be deleted.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'users',
    tour: 'users',
    icon: ShieldCheck,
    title: 'Manage Roles',
    summary: 'Admin-only: create staff accounts and manage all user accounts.',
    roles: ['admin'],
    body: (
      <>
        <p>This page lists every account in the system — Admins, Secretaries, and Subscribers alike.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Add Staff Account</strong> — creates a new Secretary login. A role can't be changed after the account is created, as a safety measure.</li>
          <li><strong>Account Status</strong> dropdown (per row) — set an account to Pending, Active, or Inactive.</li>
          <li className="flex items-start gap-1.5">
            <KeyRound className="size-4 mt-0.5 shrink-0" />
            <span><strong>Reset Password</strong> — there is no self-service "forgot password" flow in SWIFT. If a secretary or subscriber forgets their password, come here, find their row, and click Reset Password to set a new one for them.</span>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'settings',
    tour: 'settings',
    icon: SettingsIcon,
    title: 'Settings',
    summary: (role) =>
      role === 'subscriber'
        ? 'Appearance, tour options, and logout behavior.'
        : 'Appearance, tour options, logout behavior, and SMS tools.',
    roles: ['admin', 'secretary', 'subscriber'],
    body: (role) => (
      <>
        <p>These preferences are saved on the device and browser you are using.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Dark Mode</strong> — switch between light and dark appearance.</li>
          <li><strong>Confirm before logging out</strong> — turn off if you don't want the "are you sure?" prompt every time you log out.</li>
          <li><strong>Show "Take a tour" buttons</strong> — turn off to hide the Take a tour buttons on pages and forms. You can still start any tour from this Guide with <em>Show me</em>.</li>
          <li><strong>Replay welcome tour</strong> — walks through the menu again, the same tour shown on your first visit.</li>
          {role !== 'subscriber' && (
            <>
              <li><strong>Send SMS</strong> — send a one-off text message to any Philippine mobile number. Enter the number and a message (up to 300 characters), then click <em>Send SMS</em>. Messages go out through PhilSMS and may use SMS credit.</li>
              <li><strong>Payment Reminders</strong> — texts a balance reminder to every subscriber currently marked Unpaid. The number of unpaid subscribers is shown first, and the button is disabled when there are none. Sent messages cannot be recalled, so check the count before you click <em>Send Reminders</em>.</li>
            </>
          )}
        </ul>
        {role === 'subscriber' && (
          <p>The SMS tools are for staff only. Payment reminders reach you as text messages from the company.</p>
        )}
      </>
    ),
  },
]

// Plain text of a JSX body, so the search can look inside section content.
const nodeText = (n) => {
  if (n == null || typeof n === 'boolean') return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(nodeText).join(' ')
  return nodeText(n.props?.children)
}

// A section's summary and body can be a function of the role, so the text each
// person reads (and searches) matches what applies to them.
const forRole = (v, role) => (typeof v === 'function' ? v(role) : v)

const sectionsForRole = (role) =>
  SECTIONS.filter((s) => !s.roles || s.roles.includes(role)).map((s) => {
    const summary = forRole(s.summary, role)
    const body = forRole(s.body, role)
    return { ...s, summary, body, haystack: `${s.title} ${summary} ${nodeText(body)}`.toLowerCase() }
  })

const HIGHLIGHT_NAME = 'guide-search'

// Marks matches on the page with the CSS Custom Highlight API (no DOM changes).
// Browsers without it still filter; they just do not highlight.
function useSearchHighlight(containerId, terms, watch) {
  useEffect(() => {
    if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return
    CSS.highlights.delete(HIGHLIGHT_NAME)
    const root = document.getElementById(containerId)
    if (!root || terms.length === 0) return

    const ranges = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue.toLowerCase()
      for (const term of terms) {
        let from = 0
        for (let at = text.indexOf(term, from); at !== -1; at = text.indexOf(term, from)) {
          const range = new Range()
          range.setStart(node, at)
          range.setEnd(node, at + term.length)
          ranges.push(range)
          from = at + term.length
        }
      }
    }
    if (ranges.length) CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges))
    return () => CSS.highlights.delete(HIGHLIGHT_NAME)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, terms.join(' '), watch])
}

export default function Guide() {
  const { user } = useAuth()
  const role = user?.role
  const [query, setQuery] = useState('')
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const available = useMemo(() => sectionsForRole(role), [role])
  const sections = available.filter((s) => terms.every((t) => s.haystack.includes(t)))
  const searching = terms.length > 0

  useSearchHighlight('guide-results', sections.length ? terms : [], sections.map((s) => s.id).join(','))

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Guide</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          A quick reference for every screen in SWIFT. Scroll through, or jump straight to what you need.
        </p>
      </div>

      <div role="search" className="space-y-2">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400"
            aria-hidden="true"
          />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('')
            }}
            placeholder="Search the guide, e.g. reset password, export, reconnect"
            aria-label="Search the guide"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <p className="min-h-4 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
          {searching
            ? `${sections.length} of ${available.length} section${available.length === 1 ? '' : 's'} match`
            : ''}
        </p>
      </div>

      {!searching && (
        <Card className="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900">
          <CardContent className="flex items-start gap-3">
            <Info className="size-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-900 dark:text-blue-300">
              Forgot your password? There's no self-reset — ask an Admin to reset it for you from the Manage Roles page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Jump-to nav */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {s.title}
          </a>
        ))}
      </div>

      <div id="guide-results" className="space-y-4">
        {sections.length === 0 && (
          <Card>
            <CardContent className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
              <p>
                No sections match <strong>"{query.trim()}"</strong>. Try a different word, or clear the search.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuery('')}>
                Clear search
              </Button>
            </CardContent>
          </Card>
        )}
        {sections.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.id} id={s.id} className="scroll-mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-4 text-primary" />
                  {s.title}
                  {s.roles && !s.roles.includes('subscriber') && (
                    <Badge variant="outline" className="ml-1 text-[10px] font-normal capitalize">
                      {s.roles.join(' / ')}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{s.summary}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
                {s.body}
                {s.tour && TOUR_PAGES[s.tour] && (
                  <Link
                    to={`${TOUR_PAGES[s.tour]}?tour=1`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
                  >
                    <PlayCircle className="size-4" />
                    Show me
                  </Link>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
