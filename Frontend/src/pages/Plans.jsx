import { useEffect, useState } from 'react'
import api from '../api/axios'
import { TableSkeleton } from '../components/Skeletons.jsx'
import { Archive, ChevronRight, MousePointerClick, Pencil } from 'lucide-react'
import { errorMessage } from '../utils/errors'
import { useOnReconnect } from '../hooks/useOnline'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import Modal from '../components/Modal'
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
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import TourButton from "../components/TourButton.jsx";
import Toast from "../components/Toast.jsx";
import PlanDetailsModal from "./PlanDetailsModal";

const emptyForm = { plan_name: '', monthly_rate: '', description: '', speed_mbps: '', status: 'Active' }

export default function Plans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [detailsPlan, setDetailsPlan] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { toast, showToast } = useToast()
  const { can } = useAuth()
  const canArchive = can('plans.manage')
  const canManage = canArchive

  const fetchPlans = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/plans')
      setPlans(response.data)
    } catch (err) {
      setError(errorMessage(err, 'Failed to load plans.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  useOnReconnect(fetchPlans)

  const openAddModal = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormErrors({})
    setShowModal(true)
  }

  const openEditModal = (plan) => {
    setEditingId(plan.plan_id)
    setForm({
      plan_name: plan.plan_name,
      monthly_rate: plan.monthly_rate,
      description: plan.description || '',
      speed_mbps: plan.speed_mbps || '',
      status: plan.status,
    })
    setFormErrors({})
    setShowModal(true)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const setFieldValue = (field) => (value) => {
    setForm({ ...form, [field]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormErrors({})

    try {
      if (editingId) {
        await api.patch(`/plans/${editingId}`, form)
        showToast('Plan updated successfully.')
      } else {
        await api.post('/plans', form)
        showToast('Plan created successfully.')
      }
      setShowModal(false)
      fetchPlans()
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors)
      } else {
        showToast(err.response?.data?.message || 'Failed to save plan.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.delete(`/plans/${deleteTarget.plan_id}`)
      setPlans((prev) => prev.filter((p) => p.plan_id !== deleteTarget.plan_id))
      showToast(`"${deleteTarget.plan_name}" was archived.`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to archive plan.', 'error')
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          {loading ? (
            <>
              <h1 className="sr-only">Service Plans</h1>
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-9 w-28" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Service Plans</h1>
              <div className="flex gap-2">
                <TourButton tour="plans" />
                {canManage && <Button data-tour="plans-add" onClick={openAddModal}>Add Plan</Button>}
              </div>
            </>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <TableSkeleton rows={5} columns={[
            { label: 'Name' }, { label: 'Rate' }, { label: 'Speed (Mbps)' }, { label: 'Description' },
            { label: 'Status', kind: 'badge' }, { label: 'Actions', kind: 'actions' },
          ]} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Toast toast={toast} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Service Plans</h1>
        <div className="flex gap-2">
                <TourButton tour="plans" />
                {canManage && <Button data-tour="plans-add" onClick={openAddModal}>Add Plan</Button>}
              </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No plans yet.</p>
      ) : (
        <>
        <p className="mb-2 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
          <MousePointerClick className="size-4 shrink-0" aria-hidden="true" />
          Click a plan's name to see its details. Each row also has Edit and Archive buttons.
        </p>

        <div data-tour="plans-table" className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Speed (Mbps)</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.plan_id}>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                    <button
                        data-tour="plans-name"
                        type="button"
                        onClick={() => setDetailsPlan(plan)}
                        aria-haspopup="dialog"
                        title="View details"
                        className="group inline-flex items-center gap-0.5 text-left font-semibold text-blue-700 dark:text-blue-400 underline decoration-blue-700/40 dark:decoration-blue-400/40 underline-offset-2 hover:decoration-current focus-visible:decoration-current"
                      >
                        {plan.plan_name}
                        <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </button>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    ₱{Number(plan.monthly_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{plan.speed_mbps || '—'}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400 max-w-xs truncate">{plan.description || '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={plan.status === 'Active'
                        ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'}
                    >
                      {plan.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div data-tour="plans-row-actions" className="flex gap-2">
                      {canManage && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEditModal(plan)} aria-label={`Edit ${plan.plan_name}`}>
                          <Pencil className="size-3.5" aria-hidden="true" />
                          Edit
                        </Button>
                      )}
                      {canArchive && (
                        <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setDeleteTarget(plan)} aria-label={`Archive ${plan.plan_name}`}>
                          <Archive className="size-3.5" aria-hidden="true" />
                          Archive
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      <PlanDetailsModal
        plan={detailsPlan}
        canArchive={canArchive}
        onClose={() => setDetailsPlan(null)}
        onEdit={(p) => {
          setDetailsPlan(null)
          openEditModal(p)
        }}
        onArchive={(p) => {
          setDetailsPlan(null)
          setDeleteTarget(p)
        }}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Plan' : 'Add Plan'}
        description={editingId ? "Update this plan's details." : 'Set up a new service plan.'}
        size="md"
        confirmClose
        footer={(requestClose) => (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" form="plan-form" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      >
        <form id="plan-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-end">
            <TourButton tour="planForm" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan_name">
              Plan Name<span className="text-red-500 ml-0.5">*</span>
            </Label>
            <Input
              id="plan_name"
              name="plan_name"
              value={form.plan_name}
              onChange={handleChange}
              required
              className={formErrors.plan_name ? 'border-red-400' : ''}
            />
            {formErrors.plan_name && <p className="text-red-500 text-xs">{formErrors.plan_name[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="monthly_rate">
                Monthly Rate<span className="text-red-500 ml-0.5">*</span>
              </Label>
              <Input
                id="monthly_rate"
                type="number"
                step="0.01"
                name="monthly_rate"
                value={form.monthly_rate}
                onChange={handleChange}
                required
                className={formErrors.monthly_rate ? 'border-red-400' : ''}
              />
              {formErrors.monthly_rate && <p className="text-red-500 text-xs">{formErrors.monthly_rate[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="speed_mbps">Speed (Mbps)</Label>
              <Input
                id="speed_mbps"
                type="number"
                name="speed_mbps"
                value={form.speed_mbps}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <span className="text-xs text-gray-500 dark:text-gray-400">{form.description.length}/200</span>
            </div>
            <Textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              maxLength={200}
            />
          </div>

          <div data-tour="plan-status" className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={setFieldValue('status')}>
              <SelectTrigger className="w-full" aria-label="Plan status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
      </Modal>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <><strong>"{deleteTarget.plan_name}"</strong> will no longer be offered for new subscribers. Subscribers already on this plan keep it and are still billed normally. You can restore it from the Archive page.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? 'Archiving...' : 'Archive Plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}