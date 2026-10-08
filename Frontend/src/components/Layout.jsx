import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import { useFirstVisitTour } from '../tour/useTour'

const TITLES = {
  '/dashboard': 'Dashboard',
  '/subscribers': 'Subscribers',
  '/approvals': 'Pending Approvals',
  '/plans': 'Service Plans',
  '/payments': 'Payments',
  '/reports': 'Reports',
  '/archive': 'Archive',
  '/users': 'Manage Roles',
  '/audit': 'Audit Trail',
  '/settings': 'Settings',
  '/guide': 'Guide',
}

// Every route mounts its own Layout, so this tells a first load from a later navigation.
let hasNavigated = false

export default function Layout({ children }) {
  useFirstVisitTour('layout')
  const { pathname } = useLocation()
  const mainRef = useRef(null)

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('sidebarOpen')
    return stored !== null ? stored === 'true' : true
  })

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev
      localStorage.setItem('sidebarOpen', String(next))
      return next
    })
  }

  // Screen readers get the new page title, and focus moves to the content after navigating.
  useEffect(() => {
    const title = TITLES[pathname]
    document.title = title ? `${title} · SWIFT` : 'SWIFT'
    if (hasNavigated) mainRef.current?.focus({ preventScroll: true })
    hasNavigated = true
  }, [pathname])

  const skipToContent = (e) => {
    e.preventDefault()
    mainRef.current?.focus()
  }

  return (
    <div>
      <a
        href="#main-content"
        onClick={skipToContent}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <Sidebar open={sidebarOpen} onToggle={toggleSidebar} />
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className={`p-4 pt-20 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-all duration-200 outline-none ${
          sidebarOpen ? 'md:ml-60' : 'md:ml-16'
        }`}
      >
        {children}
      </main>
    </div>
  )
}
