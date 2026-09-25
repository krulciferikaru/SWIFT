import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Users2,
  ClipboardCheck,
  Wifi,
  Wallet,
  FileText,
  ShieldCheck,
  Settings as SettingsIcon,
  KeyRound,
  Info,
} from 'lucide-react'

// A single scrollable reference page, not an interactive tour — so it reads
// fine on a phone, can be printed, and doesn't require figuring out how to
// operate a tutorial on top of learning the app itself.
const SECTIONS = [
  {
    id: 'dashboard',
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
    icon: Users2,
    title: 'Subscribers',
    summary: 'The full list of cable TV/internet subscribers.',
    roles: ['admin', 'secretary'],
    body: (
      <>
        <p>This is the master list of everyone signed up for service. At the top you'll see totals for Total, Pending, Active, Unpaid, and Disconnected.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Search box</strong> — type a name, email, or MAC address to filter the list. You don't need to press Enter, it filters as you type.</li>
          <li><strong>Status dropdown</strong> — narrow the list to only Active, Unpaid, or Disconnected subscribers.</li>
          <li><strong>Add Subscriber</strong> — opens a form to manually register a new subscriber (name, plan, contact info, etc.).</li>
          <li><strong>Edit</strong> (per row) — update a subscriber's details, like their assigned plan or contact number.</li>
          <li><strong>Delete</strong> (per row) — permanently removes a subscriber record. Use carefully — this cannot be undone.</li>
          <li><strong>Payments</strong> (per row) — jumps straight to that subscriber's billing page (see the Payments section below).</li>
          <li><strong>Export CSV</strong> — downloads the current filtered list as a spreadsheet file.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'approvals',
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
          <li><strong>Account Claims tab</strong> — this is different from a new sign-up. It happens when someone registers using an email that matches an <em>existing</em> subscriber already on file (for example, an old subscriber who never had a login before). Always double-check the name, address, and contact number shown against what you have on file before approving a claim — approving it links that login to the existing subscriber's record and billing history.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'plans',
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
          <li><strong>Delete</strong> — <em>Admin only.</em> If subscribers are still on that plan, deleting may fail or affect their billing — reassign subscribers off a plan before removing it.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'payments',
    icon: Wallet,
    title: 'Payments',
    summary: 'Record a subscriber\'s payment and see their balance.',
    roles: ['admin', 'secretary'],
    body: (
      <>
        <p>This is where you'll spend the most time day-to-day.</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Search for the subscriber by name, email, or MAC address.</li>
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
    icon: FileText,
    title: 'Reports',
    summary: 'Monthly collection totals and financial statements, exportable to PDF/Excel.',
    roles: ['admin', 'secretary'],
    body: (
      <>
        <p>Pick a month at the top, then review:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Monthly Collection Report</strong> — how much was collected that month, broken down by plan and by payment method, plus a full payment ledger.</li>
          <li><strong>Financial Statement</strong> — who owes what: total receivables, paid, and outstanding balances, broken down by plan and per-subscriber.</li>
        </ul>
        <p>Each report has <strong>PDF</strong> and <strong>XLSX</strong> (Excel) download buttons if you need to print or send it somewhere.</p>
      </>
    ),
  },
  {
    id: 'users',
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
    icon: SettingsIcon,
    title: 'Settings',
    summary: 'Appearance, logout behavior, and SMS tools.',
    roles: ['admin', 'secretary', 'subscriber'],
    body: (
      <>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Dark Mode</strong> — switch between light and dark appearance.</li>
          <li><strong>Confirm before logging out</strong> — turn off if you don't want the "are you sure?" prompt every time you log out.</li>
          <li><strong>Send SMS</strong> <em>(Admin/Secretary)</em> — send a one-off text message to any Philippine mobile number.</li>
          <li><strong>Payment Reminders</strong> <em>(Admin/Secretary)</em> — sends a balance-reminder text to every subscriber currently marked Unpaid, in one click.</li>
        </ul>
      </>
    ),
  },
]

export default function Guide() {
  const { user } = useAuth()
  const role = user?.role
  const sections = SECTIONS.filter((s) => !s.roles || s.roles.includes(role))

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Guide</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          A quick reference for every screen in SWIFT. Scroll through, or jump straight to what you need.
        </p>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-6 flex items-start gap-3">
          <Info className="size-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-900 dark:text-blue-300">
            Forgot your password? There's no self-reset — ask an Admin to reset it for you from the Manage Roles page.
          </p>
        </CardContent>
      </Card>

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

      <div className="space-y-4">
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
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
