import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../api/axios'

const navItemsByRole = {
  admin: [
    { label: 'Subscribers', path: '/subscribers' },
    { label: 'Pending Approvals', path: '/approvals' },
    { label: 'Service Plans', path: '/plans' },
    { label: 'Manage Roles', path: '/users' },
  ],
  secretary: [
    { label: 'Subscribers', path: '/subscribers' },
    { label: 'Pending Approvals', path: '/approvals' },
    { label: 'Service Plans', path: '/plans' },
  ],
  subscriber: [
    { label: 'My Account', path: '/subscribers' },
    { label: 'Service Plans', path: '/plans' },
  ],
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  const navItems = navItemsByRole[user?.role] || []

  const handleLogout = async () => {
    try {
      await api.post('/logout')
    } catch {
      // ignore errors, clear locally anyway
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-gray-900 text-white flex flex-col overflow-y-auto">
      <div className="p-4 text-lg font-semibold border-b border-gray-700">
        SWIFT
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-3 py-2 rounded-md text-sm ${
              location.pathname === item.path
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        {user && (
          <p className="text-xs text-gray-400 mb-2">{user.name} ({user.role})</p>
        )}
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md text-sm"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}