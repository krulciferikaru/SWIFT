import { useEffect, useState, useCallback } from 'react'
import usersApi from '../api/users'
import { useAuth } from '../context/AuthContext'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import Modal from '../components/Modal'
import { useToast } from '../hooks/useToast'
import { UserPlus } from 'lucide-react'

const ROLE_FILTERS = ['All', 'admin', 'secretary', 'subscriber']
const STATUS_STYLES = {
  active: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
  pending: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
}
const ROLE_STYLES = {
  admin: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  secretary: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
  subscriber: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
}

const EMPTY_STAFF_FORM = {
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: 'secretary',
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

  const [actionLoading, setActionLoading] = useState(null)

  const [showCreate, setShowCreate] = useState(false)
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF_FORM)
  const [staffErrors, setStaffErrors] = useState({})
  const [creating, setCreating] = useState(false)
  const [pendingCreate, setPendingCreate] = useState(null) // holds form data while confirming admin creation

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

  const openCreateModal = () => {
    setStaffForm(EMPTY_STAFF_FORM)
    setStaffErrors({})
    setShowCreate(true)
  }

  const handleStaffFormChange = (e) => {
    setStaffForm({ ...staffForm, [e.target.name]: e.target.value })
  }

  const submitCreate = async (e) => {
    e.preventDefault()
    setStaffErrors({})

    // Admin creation is high-privilege — require an extra confirmation step.
    if (staffForm.role === 'admin') {
      setPendingCreate(staffForm)
      return
    }

    await createStaffAccount(staffForm)
  }

  const createStaffAccount = async (data) => {
    setCreating(true)
    try {
      await usersApi.create(data)
      showToast(`${data.name}'s ${data.role} account was created.`)
      setShowCreate(false)
      setPendingCreate(null)
      fetchUsers()
    } catch (err) {
      if (err.response?.status === 422) {
        setStaffErrors(err.response.data.errors ?? {})
        setPendingCreate(null)
      } else {
        showToast(err.response?.data?.message || 'Failed to create account.', 'error')
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md text-sm text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Roles</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Staff roles are fixed at account creation and cannot be changed afterward.
            </p>
          </div>
        )}
        <Button onClick={openCreateModal} className="gap-2">
          <UserPlus className="size-4" />
          Add Staff Account
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-full sm:w-40" />
        </div>
      ) : (
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
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">{error}</div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-12" /></TableHead>
                <TableHead><Skeleton className="h-4 w-14" /></TableHead>
                <TableHead><Skeleton className="h-4 w-10" /></TableHead>
                <TableHead><Skeleton className="h-4 w-28" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
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
                      <Badge variant="outline" className={`capitalize ${ROLE_STYLES[user.role]}`}>
                        {user.role}
                      </Badge>
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
                            <SelectItem value="inactive">Inactive</SelectItem>
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
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="px-3 py-1">Page {page} of {meta.last_page}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(p + 1, meta.last_page))} disabled={page === meta.last_page}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Staff Account"
        description="Creates a dedicated Secretary account. The role cannot be changed after creation."
        size="md"
        confirmClose
        footer={(requestClose) => (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" form="staff-create-form" disabled={creating}>
              {creating ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        )}
      >
        <form id="staff-create-form" onSubmit={submitCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="staff-name">Full Name<span className="text-red-500 ml-0.5">*</span></Label>
            <Input
              id="staff-name"
              name="name"
              value={staffForm.name}
              onChange={handleStaffFormChange}
              required
              className={staffErrors.name ? 'border-red-400' : ''}
            />
            {staffErrors.name && <p className="text-red-500 text-xs">{staffErrors.name[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-email">Email<span className="text-red-500 ml-0.5">*</span></Label>
            <Input
              id="staff-email"
              type="email"
              name="email"
              value={staffForm.email}
              onChange={handleStaffFormChange}
              required
              className={staffErrors.email ? 'border-red-400' : ''}
            />
            {staffErrors.email && <p className="text-red-500 text-xs">{staffErrors.email[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Role<span className="text-red-500 ml-0.5">*</span></Label>
            <Select value={staffForm.role} onValueChange={(v) => setStaffForm({ ...staffForm, role: v })} disabled>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="secretary">Secretary</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">This cannot be changed once the account is created.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-password">Password<span className="text-red-500 ml-0.5">*</span></Label>
            <Input
              id="staff-password"
              type="password"
              name="password"
              value={staffForm.password}
              onChange={handleStaffFormChange}
              required
              className={staffErrors.password ? 'border-red-400' : ''}
            />
            {staffErrors.password && <p className="text-red-500 text-xs">{staffErrors.password[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-password-confirm">Confirm Password<span className="text-red-500 ml-0.5">*</span></Label>
            <Input
              id="staff-password-confirm"
              type="password"
              name="password_confirmation"
              value={staffForm.password_confirmation}
              onChange={handleStaffFormChange}
              required
            />
          </div>
        </form>
      </Modal>

      <AlertDialog open={!!pendingCreate} onOpenChange={(open) => { if (!open) setPendingCreate(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create a Secretary account?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCreate && (
                <>
                  You're about to create a <strong>Secretary</strong> account for <strong>{pendingCreate.name}</strong> ({pendingCreate.email}).
                  This grants limited administrative access to the system. This action cannot be undone from within the app.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => createStaffAccount(pendingCreate)} disabled={creating}>
              {creating ? 'Creating...' : 'Confirm Create Secretary'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}