import { useEffect, useState, useCallback, useRef } from 'react'
import usersApi from '../api/users'
import { capitalizeWords } from '../utils/text'
import { TableSkeleton } from '../components/Skeletons.jsx'
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
import { useOnReconnect } from '../hooks/useOnline'
import { UserPlus, SlidersHorizontal, ShieldCheck, ShieldOff, Info } from 'lucide-react'
import ConfirmAction from '../components/ConfirmAction.jsx'
import PermissionsModal from '../components/PermissionsModal.jsx'
import TourButton from "../components/TourButton.jsx";
import Toast from "../components/Toast.jsx";
import BackToSettings from '../components/BackToSettings.jsx'
import { useQueryState } from '../hooks/useQueryState'
import SortableHead, { nextSort } from '../components/SortableHead.jsx'
import Pager from '../components/Pager.jsx'
import FormField, { RequiredNote } from '../components/FormField.jsx'
import { required, emailAddress, mobileNumber, minLength, matches, firstError } from '../utils/validators'
import EmptyState from '../components/EmptyState.jsx'

// What the address holds. Newest accounts first until a column is chosen.
const VIEW_DEFAULTS = { q: '', role: 'All', page: 1, per: 15, sort: '', dir: 'asc' }
const USER_SORT_DEFAULT = { sort: '', dir: 'asc' }

const ROLE_FILTERS = ['All', 'admin', 'secretary', 'collector', 'subscriber']
const STATUS_STYLES = {
  active: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
  pending: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
}
const ROLE_STYLES = {
  admin: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  secretary: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
  collector: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-900',
  subscriber: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
}

const EMPTY_STAFF_FORM = {
  name: '',
  email: '',
  contact_number: '',
  password: '',
  password_confirmation: '',
  role: 'secretary',
}

export default function Users() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  // Only the very first load swaps the page for skeletons. Later fetches (typing in
  // the search box, changing the role filter) keep the controls mounted; otherwise
  // the search box is replaced on every keystroke and loses focus.
  const [initialLoad, setInitialLoad] = useState(true)
  const requestId = useRef(0)
  const [error, setError] = useState('')

  const [view, setView] = useQueryState(VIEW_DEFAULTS)
  const search = view.q
  const roleFilter = ROLE_FILTERS.includes(view.role) ? view.role : 'All'
  const page = view.page
  const perPage = view.per
  const sort = view.sort
  const dir = view.dir
  const setRoleFilter = (value) => setView({ role: value, page: 1 })
  const setPage = (value) => setView({ page: Math.max(value, 1) })
  const changeSort = (column) => setView(nextSort({ sort, dir }, column, USER_SORT_DEFAULT))
  // What is typed in the box; it reaches the address after a short pause.
  const [searchText, setSearchText] = useState(view.q)
  const latestSearch = useRef(search)
  latestSearch.current = search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchText !== latestSearch.current) setView({ q: searchText, page: 1 })
    }, 300)
    return () => clearTimeout(t)
  }, [searchText, setView])

  const [actionLoading, setActionLoading] = useState(null)

  const [showCreate, setShowCreate] = useState(false)
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF_FORM)
  const [staffErrors, setStaffErrors] = useState({})
  const [creating, setCreating] = useState(false)
  const [touched, setTouched] = useState({})
  const [pendingCreate, setPendingCreate] = useState(null) // holds form data while confirming admin creation

  const [permTarget, setPermTarget] = useState(null) // secretary or collector whose permissions are being edited
  const [mfaResetTarget, setMfaResetTarget] = useState(null) // someone whose two-step sign-in is being reset
  const [mfaResetting, setMfaResetting] = useState(false)

  const { toast, showToast } = useToast()

  const fetchUsers = useCallback(async () => {
    const thisRequest = ++requestId.current
    setLoading(true)
    setError('')
    try {
      const params = { page, per_page: perPage }
      if (sort) {
        params.sort = sort
        params.direction = dir
      }
      if (search) params.search = search
      if (roleFilter !== 'All') params.role = roleFilter

      const res = await usersApi.getAll(params)
      if (thisRequest !== requestId.current) return // a newer search replaced this one
      const responseData = res.data.data
      setUsers(responseData.data ?? [])
      setMeta(responseData)
    } catch (err) {
      if (thisRequest !== requestId.current) return
      setError(err.response?.data?.message || 'Failed to load users.')
    } finally {
      if (thisRequest === requestId.current) {
        setLoading(false)
        setInitialLoad(false)
      }
    }
  }, [search, roleFilter, page, perPage, sort, dir])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useOnReconnect(fetchUsers)

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
    setTouched({})
    setShowCreate(true)
  }

  const handleStaffFormChange = (e) => {
    const { name, value } = e.target
    setStaffForm({ ...staffForm, [name]: name === 'name' ? capitalizeWords(value) : value })
  }

  const staffChecks = {
    name: required('Full name')(staffForm.name),
    email: firstError(staffForm.email, required('Email'), emailAddress),
    contact_number: mobileNumber(staffForm.contact_number),
    password: firstError(staffForm.password, required('Password'), minLength('Password', 8)),
    password_confirmation: firstError(
      staffForm.password_confirmation,
      required('Password confirmation'),
      matches(() => staffForm.password, 'The two passwords do not match.'),
    ),
  }
  const staffError = (name) => staffErrors[name]?.[0] ?? (touched[name] ? staffChecks[name] : '')
  const staffBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }))

  const submitCreate = async (e) => {
    e.preventDefault()
    const firstBad = Object.keys(staffChecks).find((name) => staffChecks[name])
    if (firstBad) {
      setTouched({ name: true, email: true, contact_number: true, password: true, password_confirmation: true })
      document.getElementById({ name: 'staff-name', email: 'staff-email', contact_number: 'staff-mobile', password: 'staff-password', password_confirmation: 'staff-password-confirm' }[firstBad])?.focus()
      return
    }
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
      showToast(`${data.name}'s ${data.role === 'collector' ? 'field collector' : data.role} account was created.`)
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
      <Toast toast={toast} />

      <BackToSettings className="mb-3" />

      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        {initialLoad ? (
          <div className="space-y-2">
            <h1 className="sr-only">Manage Roles</h1>
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
        <div className="flex gap-2">
          <TourButton tour="users" />
          <Button data-tour="users-add" onClick={openCreateModal} className="gap-2">
            <UserPlus className="size-4" />
            Add Staff Account
          </Button>
        </div>
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Nobody here can see or reset another person's password. Everyone recovers their own with <strong>Forgot password</strong> on the
          sign-in page, using a code texted to their verified mobile number. Staff add and verify theirs in Settings.
        </span>
      </p>

      {initialLoad ? (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-full sm:w-40" />
        </div>
      ) : (
        <div data-tour="users-filters" className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            type="text"
            placeholder="Search by name or email…"
            aria-label="Search accounts"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by role">
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
        <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">{error}</div>
      )}

      <div
        data-tour="users-table"
        aria-busy={loading}
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-opacity ${loading && !initialLoad ? 'opacity-60' : ''}`}
      >
        {initialLoad ? (
          <TableSkeleton rows={6} columns={[
            { label: 'Name' }, { label: 'Email' }, { label: 'Role', kind: 'badge' },
            { label: 'Account Status' }, { label: 'Actions', kind: 'actions' },
          ]} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No accounts match"
            description="Try a different name or email, or another role."
            onClearFilters={search || roleFilter !== 'All' ? () => { setSearchText(''); setView({ q: '', role: 'All', page: 1 }) } : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead column="name" sort={sort} dir={dir} onSort={changeSort}>Name</SortableHead>
                <TableHead>Email</TableHead>
                <SortableHead column="role" sort={sort} dir={dir} onSort={changeSort}>Role</SortableHead>
                <SortableHead column="status" sort={sort} dir={dir} onSort={changeSort}>Account Status</SortableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = currentUser && user.id === currentUser.id
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      {user.name}
                      {isSelf && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(you)</span>}
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
                          <SelectTrigger data-tour="users-status" aria-label={`Account status for ${user.name}`} className="w-32 capitalize">
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
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                      {(user.role === 'secretary' || user.role === 'collector') && (
                        <Button
                          data-tour="users-permissions"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setPermTarget(user)}
                          aria-label={`Edit permissions for ${user.name}`}
                        >
                          <SlidersHorizontal className="size-3.5" />
                          Permissions
                        </Button>
                      )}
                      {user.mfa_enabled && user.id !== currentUser?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setMfaResetTarget(user)}
                          aria-label={`Reset two-step sign-in for ${user.name}`}
                        >
                          <ShieldOff className="size-3.5" aria-hidden="true" />
                          Reset two-step
                        </Button>
                      )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Pager
        meta={meta}
        page={page}
        onPage={setPage}
        perPage={perPage}
        onPerPage={(n) => setView({ per: n, page: 1 })}
        noun="accounts"
      />

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Staff Account"
        description="Creates a dedicated Secretary account. The role cannot be changed after creation."
        size="md"
        confirmClose={JSON.stringify(staffForm) !== JSON.stringify(EMPTY_STAFF_FORM)}
        footer={(requestClose) => (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" form="staff-create-form" disabled={creating} className="gap-2">
              <UserPlus className="size-4" aria-hidden="true" />
              {creating ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        )}
      >
        <form id="staff-create-form" onSubmit={submitCreate} noValidate className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <RequiredNote />
            <TourButton tour="staffForm" />
          </div>

          <FormField id="staff-name" label="Full Name" required error={staffError('name')}>
            <Input name="name" value={staffForm.name} onChange={handleStaffFormChange} onBlur={staffBlur} autoComplete="off" />
          </FormField>

          <FormField id="staff-email" label="Email" required error={staffError('email')}>
            <Input type="email" name="email" value={staffForm.email} onChange={handleStaffFormChange} onBlur={staffBlur} autoComplete="off" />
          </FormField>

          <FormField
            id="staff-mobile"
            label="Mobile number"
            optional
            hint="Lets this person reset their own password by text. They can also add it later in Settings."
            error={staffError('contact_number')}
          >
            <Input type="tel" name="contact_number" value={staffForm.contact_number} onChange={handleStaffFormChange} onBlur={staffBlur} autoComplete="off" placeholder="0917 123 4567" />
          </FormField>

          <div data-tour="staff-role" className="space-y-1.5">
            <Label>Role<span className="text-red-500 ml-0.5">*</span></Label>
            <Select value={staffForm.role} onValueChange={(v) => setStaffForm({ ...staffForm, role: v })}>
              <SelectTrigger className="w-full" aria-label="Role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="secretary">Secretary</SelectItem>
                <SelectItem value="collector">Field Collector</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {staffForm.role === 'collector'
                ? 'A field collector can look up subscribers (without their email or MAC address) and record payments, nothing else.'
                : 'A secretary can do everything except manage accounts; an admin can switch individual tasks off.'}
              {' '}This cannot be changed once the account is created.
            </p>
          </div>

          <FormField id="staff-password" label="Password" required hint="At least 8 characters." error={staffError('password')}>
            <Input type="password" name="password" value={staffForm.password} onChange={handleStaffFormChange} onBlur={staffBlur} autoComplete="new-password" />
          </FormField>

          <FormField id="staff-password-confirm" label="Confirm Password" required error={staffError('password_confirmation')}>
            <Input type="password" name="password_confirmation" value={staffForm.password_confirmation} onChange={handleStaffFormChange} onBlur={staffBlur} autoComplete="new-password" />
          </FormField>
        </form>
      </Modal>

      <ConfirmAction
        open={!!mfaResetTarget}
        onOpenChange={(open) => { if (!open) setMfaResetTarget(null) }}
        title="Reset two-step sign-in?"
        description={
          mfaResetTarget && (
            <>
              <strong>{mfaResetTarget.name}</strong> lost their phone or their recovery codes. Their two-step sign-in is switched off and they are signed out
              everywhere. {mfaResetTarget.role === 'subscriber' ? 'They can switch it on again from Settings if they want to.' : 'They have to set it up again the next time they sign in, so it is never left off without them knowing.'}
            </>
          )
        }
        confirmLabel="Reset"
        busyLabel="Resetting..."
        destructive
        busy={mfaResetting}
        onConfirm={async () => {
          setMfaResetting(true)
          try {
            const res = await usersApi.resetMfa(mfaResetTarget.id)
            showToast(res.data.message)
            setMfaResetTarget(null)
            fetchUsers()
          } catch (err) {
            showToast(err.response?.data?.message || 'Could not reset it.', 'error')
          } finally {
            setMfaResetting(false)
          }
        }}
      />

      <PermissionsModal
        user={permTarget}
        onClose={() => setPermTarget(null)}
        onSaved={(updated, message) => {
          setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
          setPermTarget(null)
          showToast(message)
        }}
      />

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
            <AlertDialogAction variant="outline" onClick={() => createStaffAccount(pendingCreate)} disabled={creating} className="border-red-300 bg-transparent text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
              {creating ? 'Creating...' : 'Confirm Create Account'}
            </AlertDialogAction>
            <AlertDialogCancel variant="default">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}