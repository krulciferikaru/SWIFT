import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { LEGAL_DRAFT, LEGAL_UPDATED, LEGAL_VERSION } from './meta'

/**
 * The frame for the Privacy Policy and the Terms of Service: public (no sign-in needed, so it can
 * be read before registering), with a contents list and a "draft" warning until the company has
 * reviewed the wording.
 */
export default function LegalLayout({ title, intro, sections, children }) {
  useEffect(() => {
    document.title = `${title} · SWIFT`
  }, [title])

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-4">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <img src="/SWIFT_Logo.svg" alt="" className="size-5" />
            SWIFT
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {LEGAL_DRAFT && (
          <div role="note" className="mb-8 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p>
              <strong>Draft for review.</strong> This page was prepared for Jubal Brothers Cable TV Corporation, Palayan Branch, and has not
              yet been reviewed by the company or its Data Protection Officer. Items in [square brackets] still have to be filled in or confirmed.
            </p>
          </div>
        )}

        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Last updated {LEGAL_UPDATED} · Version {LEGAL_VERSION}
        </p>
        {intro && <p className="mt-6 text-base leading-relaxed text-gray-700 dark:text-gray-300">{intro}</p>}

        <nav aria-label="Contents" className="mt-8 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <p className="mb-2 text-sm font-semibold">Contents</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-primary hover:underline dark:text-blue-300">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">{children}</div>

        <footer className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-200 pt-6 text-sm dark:border-gray-800">
          <Link to="/privacy" className="text-primary hover:underline dark:text-blue-300">Privacy Policy</Link>
          <Link to="/terms" className="text-primary hover:underline dark:text-blue-300">Terms of Service</Link>
          <Link to="/login" className="text-primary hover:underline dark:text-blue-300">Sign in</Link>
        </footer>
      </main>
    </div>
  )
}

/** One numbered section; the heading is the anchor the contents list links to. */
export function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="space-y-3 text-base leading-relaxed text-gray-700 dark:text-gray-300 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_strong]:text-gray-900 dark:[&_strong]:text-gray-100">
        {children}
      </div>
    </section>
  )
}

/** A value the company still has to supply, shown so it cannot be missed. */
export function Todo({ children }) {
  return (
    <mark className="rounded bg-amber-100 px-1 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">[{children}]</mark>
  )
}
