import { Link } from 'react-router-dom'
import CompanyContact from './CompanyContact.jsx'

const legalLink = 'underline underline-offset-2 hover:no-underline'

/**
 * The frame around the sign-in and register pages: a brand panel on the left on wide screens
 * (the name of the system and the branch, and how to reach the company) and a roomy, uncluttered form column.
 * On a phone the brand panel shrinks to a short header above the form.
 */
export default function AuthLayout({ children, wide = false }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside
        aria-label="About SWIFT"
        className="hidden flex-col justify-between bg-[#305CDE] p-12 text-white lg:flex"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white">
            <img src="/SWIFT_Logo.svg" alt="" className="size-7" />
          </span>
          <span className="text-xl font-bold tracking-tight">SWIFT</span>
        </div>

        <div className="max-w-md space-y-3">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Jubal Brothers Cable TV Corp.
          </h2>
          <p className="text-xl font-medium text-blue-50">Palayan Branch</p>
          <p className="pt-2 text-sm text-blue-100">
            SWIFT: Subscriber and Web-based Information and Financial Tracking System
          </p>
        </div>

        <div className="space-y-4">
          <CompanyContact variant="panel" />
          <p className="text-sm text-blue-100">
            © {new Date().getFullYear()} Jubal Brothers Cable TV Corp. ·{' '}
            <Link to="/privacy" className={legalLink}>Privacy Policy</Link> ·{' '}
            <Link to="/terms" className={legalLink}>Terms</Link>
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10 sm:px-10">
        <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'}`}>
          {/* Phones and tablets: the brand panel becomes a compact header. */}
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <img src="/SWIFT_Logo.svg" alt="" className="size-9" />
              <span className="text-xl font-bold tracking-tight text-primary">SWIFT</span>
            </div>
            <p className="mt-3 text-2xl font-bold leading-tight text-gray-900 dark:text-gray-100">Jubal Brothers Cable TV Corp.</p>
            <p className="text-base font-medium text-gray-700 dark:text-gray-300">Palayan Branch</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Subscriber and Web-based Information and Financial Tracking System
            </p>
          </div>

          {children}

          <div className="lg:hidden">
            <CompanyContact variant="inline" />
            <p className="mt-4 text-center text-xs text-gray-600 dark:text-gray-400">
              <Link to="/privacy" className={legalLink}>Privacy Policy</Link> ·{' '}
              <Link to="/terms" className={legalLink}>Terms of Service</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
