import { useCallback, useEffect, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import paymentMethodsApi from '../api/paymentMethods'
import { refreshPaymentMethods } from '../hooks/usePaymentMethods'
import { errorMessage } from '../utils/errors'
import { useOnReconnect } from '../hooks/useOnline'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Modal from './Modal'
import { LoadingStatus } from './Skeletons.jsx'
import { Skeleton } from '@/components/ui/skeleton'
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

const RECENT = 5

/** Admin: add, rename, switch on or off, and delete the payment methods staff can choose from. */
export default function PaymentMethodsManager({ showToast }) {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null) // { id, name }
  const [editError, setEditError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await paymentMethodsApi.getAll()
      setMethods(res.data.data)
    } catch (err) {
      setError(errorMessage(err, 'Failed to load payment methods.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useOnReconnect(load)

  // After any change, refresh the shared list the payment form and report filters use.
  const changed = async () => {
    await load()
    refreshPaymentMethods().catch(() => {})
  }

  const add = async (e) => {
    e.preventDefault()
    setAdding(true)
    setAddError('')
    try {
      const res = await paymentMethodsApi.create(newName)
      setNewName('')
      showToast(res.data.message)
      await changed()
    } catch (err) {
      setAddError(errorMessage(err, 'Could not add the payment method.'))
    } finally {
      setAdding(false)
    }
  }

  const saveName = async (e) => {
    e.preventDefault()
    setBusyId(editing.id)
    setEditError('')
    try {
      await paymentMethodsApi.update(editing.id, { name: editing.name })
      setEditing(null)
      showToast('Payment method renamed. Recorded payments were updated too.')
      await changed()
    } catch (err) {
      setEditError(errorMessage(err, 'Could not rename the payment method.'))
    } finally {
      setBusyId(null)
    }
  }

  const toggle = async (method, on) => {
    setBusyId(method.id)
    try {
      await paymentMethodsApi.update(method.id, { is_active: on })
      await changed()
    } catch (err) {
      showToast(errorMessage(err, 'Could not change the payment method.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    const target = deleteTarget
    setDeleteTarget(null)
    setBusyId(target.id)
    try {
      const res = await paymentMethodsApi.remove(target.id)
      showToast(res.data.message)
      await changed()
    } catch (err) {
      showToast(errorMessage(err, 'Could not delete the payment method.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  // The card shows the first few; "View all" opens the whole list (with a search) in a window.
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('')
  const matching = methods.filter((m) => m.name.toLowerCase().includes(filter.trim().toLowerCase()))

  const renderList = (rows) => (
    <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
      {rows.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                {editing?.id === m.id ? (
                  <form onSubmit={saveName} className="flex flex-1 flex-wrap items-start gap-2">
                    <div className="min-w-48 flex-1 space-y-1">
                      <Label htmlFor={`rename-${m.id}`} className="sr-only">Name of the payment method</Label>
                      <Input
                        id={`rename-${m.id}`}
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        maxLength={50}
                        autoFocus
                        aria-invalid={editError ? true : undefined}
                      />
                      {editError && <p role="alert" className="text-xs text-red-700 dark:text-red-400">{editError}</p>}
                    </div>
                    <Button type="submit" size="sm" className="gap-1.5" disabled={busyId === m.id}>
                      <Check className="size-3.5" aria-hidden="true" /> Save
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => { setEditing(null); setEditError('') }}>
                      <X className="size-3.5" aria-hidden="true" /> Cancel
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${m.is_active ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 line-through dark:text-gray-400'}`}>
                        {m.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {m.payments_count === 0 ? 'Not used yet' : `Used by ${m.payments_count} ${m.payments_count === 1 ? 'payment' : 'payments'}`}
                        {!m.is_active && ' · switched off'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`active-${m.id}`}
                          checked={m.is_active}
                          disabled={busyId === m.id}
                          onCheckedChange={(on) => toggle(m, on)}
                          aria-label={`${m.name} is offered when recording payments`}
                        />
                        <Label htmlFor={`active-${m.id}`} className="text-xs">{m.is_active ? 'On' : 'Off'}</Label>
                      </div>
                      <Button
                        type="button" size="sm" variant="outline" className="gap-1.5"
                        onClick={() => { setEditing({ id: m.id, name: m.name }); setEditError('') }}
                        aria-label={`Rename ${m.name}`}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" /> Rename
                      </Button>
                      <Button
                        type="button" size="sm" variant="destructive" className="gap-1.5"
                        disabled={m.payments_count > 0 || busyId === m.id}
                        title={m.payments_count > 0 ? 'Already used by payments. Switch it off instead.' : undefined}
                        onClick={() => setDeleteTarget(m)}
                        aria-label={`Delete ${m.name}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" /> Delete
                      </Button>
                    </div>
                  </>
                )}
              </li>
      ))}
    </ul>
  )

  return (
    <Card data-tour="settings-payment-methods">
      <CardHeader>
        <CardTitle className="text-base">Payment methods</CardTitle>
        <CardDescription>
          The choices staff see when recording a payment, and in the report filters. A method that has been used
          can't be deleted, but you can switch it off so it is no longer offered.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">{error}</div>
        )}

        {loading ? (
          <LoadingStatus className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </LoadingStatus>
        ) : (
          <>
            {renderList(methods.slice(0, RECENT))}
            {methods.length > RECENT && (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAll(true)}>
                View all ({methods.length})
              </Button>
            )}
          </>
        )}

        <form onSubmit={add} className="flex flex-wrap items-start gap-2">
          <div className="min-w-48 flex-1 space-y-1">
            <Label htmlFor="new-method">Add a payment method</Label>
            <Input
              id="new-method"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="For example: Bank transfer, Maya, Check"
              maxLength={50}
              aria-invalid={addError ? true : undefined}
              aria-describedby={addError ? 'new-method-error' : undefined}
            />
            {addError && <p id="new-method-error" role="alert" className="text-xs text-red-700 dark:text-red-400">{addError}</p>}
          </div>
          <Button type="submit" className="mt-6 gap-1.5" disabled={adding || newName.trim().length < 2}>
            <Plus className="size-4" aria-hidden="true" /> Add
          </Button>
        </form>
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && <><strong>{deleteTarget.name}</strong> is not used by any payment, so nothing recorded is affected. Staff will no longer be able to choose it.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Modal
        isOpen={showAll}
        onClose={() => { setShowAll(false); setFilter('') }}
        title="Payment methods"
        description="Everything on the list. Rename, switch on or off, or delete from here."
        size="lg"
      >
        <div className="space-y-3">
          {methods.length > 8 && (
            <div className="space-y-1">
              <Label htmlFor="methods-filter" className="sr-only">Search payment methods</Label>
              <Input
                id="methods-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search payment methods"
                aria-label="Search payment methods"
              />
            </div>
          )}
          <div className="max-h-[55vh] overflow-y-auto">
            {matching.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-600 dark:text-gray-400">Nothing matches "{filter}".</p>
            ) : (
              renderList(matching)
            )}
          </div>
        </div>
      </Modal>
    </Card>
  )
}
