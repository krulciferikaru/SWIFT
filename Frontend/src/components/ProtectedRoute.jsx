import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'

export default function ProtectedRoute({ children, allowedRoles, permission }) {
  const { user, loading, isAuthenticated, can, connectionError, refetch } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  // Still signed in as far as we know; we just can't reach the server right now.
  if (!isAuthenticated && connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div role="alert" className="max-w-sm text-center space-y-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Can't reach SWIFT</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {navigator.onLine
              ? 'The server is not answering right now. You are still signed in.'
              : "You're offline. You are still signed in, and the page will load when your connection is back."}
          </p>
          <Button onClick={refetch}>Try again</Button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  if (permission && !can(...[].concat(permission))) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}