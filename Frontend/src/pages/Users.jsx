import { useEffect, useState, useCallback } from 'react'
import usersApi from '../api/users'
import { useAuth } from '../context/AuthContext'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '../hooks/useToast'

const ROLES = ['admin', 'secretary', 'subscriber']
const ROLE_FILTERS = ['All', ...ROLES]
const STATUS_STYLES = {
  active: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
  pending: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  rejected: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900',
}
const ROLE_STYLES = {
  admin: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  secretary: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
  subscriber: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
}

export default function Users() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [page, setPage] = useState(1)

  const [pendingRoleChange, setPendingRoleChange] = useState(null) // { user, newRole }
  const [actionLoading, setActionLoading] = useState(null)

  const { toast, showToast } = useToast()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, per_page: 15 }
      if (search) params.search = search
      if (roleFilter !== 'All') params.role = roleFilter

      const res = await usersApi.getAll(params)
      const responseData = res.data.data
      setUsers(responseData.data ?? [])
      setMeta(responseData)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, page])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter])

  const requestRoleChange = (user, newRole) => {
    if (newRole === user.role) return
    setPendingRoleChange({ user, newRole })
  }

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return
    const { user, newRole } = pendingRoleChange
    setActionLoading(user.id)
    try {
      await usersApi.updateRole(user.id, newRole)
      showToast(`${user.name}'s role changed to ${newRole}.`)
      fetchUsers()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update role.', 'error')
    } finally {
      setActionLoading(null)
      setPendingRoleChange(null)
    }
  }

  const handleStatusChange = async (user, newStatus) => {
    if (newStatus === user.account_status) return
    setActionLoading(user.id)
    try {
      await usersApi.updateStatus(user.id, newStatus)
      showToast(`${user.name}'s account status set to ${newStatus}.`)
      fetchUsers()
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md text-sm text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Roles</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Control staff and subscriber account access.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">{error}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Account Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-9 w-36 rounded-md" /></TableCell>
                  <TableCell><Skeleton className="h-9 w-32 rounded-md" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-500">No users found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Account Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = currentUser && user.id === currentUser.id
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      {user.name}
                      {isSelf && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">(you)</span>}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{user.email}</TableCell>
                    <TableCell>
                      {isSelf ? (
                        <Badge variant="outline" className={`capitalize ${ROLE_STYLES[user.role]}`}>
                          {user.role}
                        </Badge>
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => requestRoleChange(user, newRole)}
                          disabled={actionLoading === user.id}
                        >
                          <SelectTrigger className="w-36 capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {isSelf ? (
                        <Badge variant="outline" className={`capitalize ${STATUS_STYLES[user.account_status]}`}>
                          {user.account_status}
                        </Badge>
                      ) : (
                        <Select
                          value={user.account_status}
                          onValueChange={(newStatus) => handleStatusChange(user, newStatus)}
                          disabled={actionLoading === user.id}
                        >
                          <SelectTrigger className="w-32 capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Showing {meta.from}–{meta.to} of {meta.total} users</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-3 py-1">Page {page} of {meta.last_page}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, meta.last_page))}
              disabled={page === meta.last_page}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!pendingRoleChange} onOpenChange={(open) => { if (!open) setPendingRoleChange(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change this user's role?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRoleChange && (
                <>
                  You're about to change <strong>{pendingRoleChange.user.name}</strong>'s role from{' '}
                  <strong className="capitalize">{pendingRoleChange.user.role}</strong> to{' '}
                  <strong className="capitalize">{pendingRoleChange.newRole}</strong>.
                  {pendingRoleChange.newRole === 'admin' && ' This grants full administrative access to the system.'}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}