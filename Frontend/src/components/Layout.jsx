import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import { useFirstVisitTour } from '../tour/useTour'

export default function Layout({ children }) {
  useFirstVisitTour('layout')

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

  return (
    <div>
      <Sidebar open={sidebarOpen} onToggle={toggleSidebar} />
      <main className={`p-4 pt-20 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-all duration-200 ${
        sidebarOpen ? 'md:ml-60' : 'md:ml-16'
      }`}>
        {children}
      </main>
    </div>
  )
}
