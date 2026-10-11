import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingStatus, StatCardsSkeleton } from './Skeletons.jsx'

export default function ProtectedRoute({ children, allowedRoles, permission }) {
  const { user, loading, isAuthenticated, can, connectionError, refetch } = useAuth()

  if (loading) {
    return (
      <LoadingStatus className="min-h-screen bg-gray-50 dark:bg-gray-900" heading="SWIFT">
        <div className="flex min-h-screen">
          <div className="hidden md:block w-60 shrink-0 border-r border-gray-200 dark:border-gray-800 p-4 space-y-3">
            <Skeleton className="h-8 w-28" />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="flex-1 p-4 pt-20 md:p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <StatCardsSkeleton />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </LoadingStatus>
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