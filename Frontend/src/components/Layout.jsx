import { useState } from 'react'
import Sidebar from './Sidebar.jsx'

export default function Layout({ children }) {
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
      <main className={`p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-all duration-200 ${
        sidebarOpen ? 'ml-60' : 'ml-16'
      }`}>
        {children}
      </main>
    </div>
  )
}