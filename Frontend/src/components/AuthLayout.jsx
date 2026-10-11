import { BellRing, Receipt, ShieldCheck, Users2 } from 'lucide-react'
import CompanyContact from './CompanyContact.jsx'

const POINTS = [
  { icon: Users2, text: 'One searchable record of every subscriber, plan and status' },
  { icon: Receipt, text: 'Payments, balances and printable receipts' },
  { icon: BellRing, text: 'Reminders and notices sent by SMS' },
  { icon: ShieldCheck, text: 'Every change recorded, with access for each role' },
]

/**
 * The frame around the sign-in and register pages: a brand panel on the left on wide screens
 * (what SWIFT is, who it is for, how to reach the company) and a roomy, uncluttered form column.
 * On a phone the brand panel shrinks to a short header above the form.
 */
export default function AuthLayout({ children, wide = false }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside
        aria-label="About SWIFT"
        className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-blue-950 p-12 text-white lg:flex"
      >
        {/* soft decorative circles */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white">
            <img src="/SWIFT_Logo.svg" alt="" className="size-7" />
          </span>
          <span className="text-2xl font-bold tracking-tight">SWIFT</span>
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold leading-tight">
              Subscriber and Web-based Information and Financial Tracking System
            </h2>
            <p className="text-lg text-blue-50">Jubal Brothers Cable TV Corp. · Palayan Branch</p>
          </div>
          <ul className="space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-blue-50">
                <Icon className="mt-0.5 size-5 shrink-0 text-white" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative space-y-4">
          <CompanyContact variant="panel" />
          <p className="text-sm text-blue-100">© {new Date().getFullYear()} Jubal Brothers Cable TV Corp.</p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10 sm:px-10">
        <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'}`}>
          {/* Phones and tablets: the brand panel becomes a compact header. */}
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <img src="/SWIFT_Logo.svg" alt="" className="size-9" />
              <span className="text-2xl font-bold tracking-tight text-primary">SWIFT</span>
            </div>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Subscriber and Web-based Information and Financial Tracking System
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Jubal Brothers Cable TV Corp. · Palayan Branch</p>
          </div>

          {children}

          <div className="lg:hidden">
            <CompanyContact variant="inline" />
          </div>
        </div>
      </main>
    </div>
  )
}
