import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../api/axios'
import {
  Users2,
  ClipboardCheck,
  Wifi,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const navItemsByRole = {
  admin: [
    { label: 'Subscribers', path: '/subscribers', icon: Users2 },
    { label: 'Pending Approvals', path: '/approvals', icon: ClipboardCheck, showBadge: true },
    { label: 'Service Plans', path: '/plans', icon: Wifi },
    { label: 'Manage Roles', path: '/users', icon: ShieldCheck },
  ],
  secretary: [
    { label: 'Subscribers', path: '/subscribers', icon: Users2 },
    { label: 'Pending Approvals', path: '/approvals', icon: ClipboardCheck, showBadge: true },
    { label: 'Service Plans', path: '/plans', icon: Wifi },
  ],
  subscriber: [
    { label: 'My Account', path: '/subscribers', icon: Users2 },
    { label: 'Service Plans', path: '/plans', icon: Wifi },
  ],
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [pendingCount, setPendingCount] = useState(0)

  const navItems = navItemsByRole[user?.role] || []
  const canSeeApprovals = user?.role === 'admin' || user?.role === 'secretary'

  useEffect(() => {
    if (!canSeeApprovals) return
    api.get('/subscribers/pending')
      .then((res) => setPendingCount(res.data?.length ?? 0))
      .catch(() => {})
  }, [canSeeApprovals])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col overflow-y-auto border-r border-gray-200 dark:border-gray-800">
      <div className="p-4 text-lg font-semibold border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <span className="text-primary">SWIFT</span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="size-4" />
                {item.label}
              </span>
              {item.showBadge && pendingCount > 0 && (
                <Badge
                  variant="outline"
                  className={`h-5 px-1.5 text-xs ${
                    isActive
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {pendingCount}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
        {user && (
          <div className="text-xs">
            <p className="text-gray-900 dark:text-gray-100 font-medium truncate">{user.name}</p>
            <p className="text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
          </div>
        )}
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full justify-start gap-2"
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}