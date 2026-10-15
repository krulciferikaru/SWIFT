import { useEffect, useState } from 'react'
import api from '../api/axios'
import archiveApi from '../api/archive'
import { TableSkeleton } from '../components/Skeletons.jsx'
import { Archive, ChevronRight, MousePointerClick, Pencil, Plus, Save, Wifi } from 'lucide-react'
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
import ReviewDialog from '../components/ReviewDialog.jsx'
import ConfirmAction from '../components/ConfirmAction.jsx'
import FormField, { RequiredNote } from '../components/FormField.jsx'
import { required, positiveAmount, firstError } from '../utils/validators'
import EmptyState from '../components/EmptyState.jsx'
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
  // What the form held when it was opened, to tell whether anything was changed.
  const [formBaseline, setFormBaseline] = useState(emptyForm)
  // The plan about to be archived: staff confirm first.
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [detailsPlan, setDetailsPlan] = useState(null)

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
    setFormBaseline(emptyForm)
    setTouched({})
    setFormErrors({})
    setShowModal(true)
  }

  const openEditModal = (plan) => {
    setEditingId(plan.plan_id)
    const opened = {
      plan_name: plan.plan_name,
      monthly_rate: plan.monthly_rate,
      description: plan.description || '',
      speed_mbps: plan.speed_mbps || '',
      status: plan.status,
    }
    setForm(opened)
    setFormBaseline(opened)
    setFormErrors({})
    setTouched({})
    setShowModal(true)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const setFieldValue = (field) => (value) => {
    setForm({ ...form, [field]: value })
  }

  // Changing a plan's monthly rate changes what its subscribers are billed, so it is reviewed first.
  const [reviewOpen, setReviewOpen] = useState(false)
  const editingPlan = editingId ? plans.find((p) => p.plan_id === editingId) : null
  const rateChanged =
    !!editingPlan && Number(editingPlan.monthly_rate) !== Number(form.monthly_rate)
  const peso = (value) =>
    `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

  // A field is only checked once the person has left it, or tried to save.
  const [touched, setTouched] = useState({})
  const localErrors = {
    plan_name: required('Plan name')(form.plan_name),
    monthly_rate: firstError(form.monthly_rate, required('Monthly rate'), positiveAmount),
    speed_mbps:
      String(form.speed_mbps ?? '') !== '' && !(Number(form.speed_mbps) > 0)
        ? 'Speed must be a number above zero, or left empty.'
        : '',
  }
  const fieldError = (name) => formErrors[name]?.[0] ?? (touched[name] ? localErrors[name] : '')
  const handleBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const firstBad = Object.keys(localErrors).find((name) => localErrors[name])
    if (firstBad) {
      setTouched({ plan_name: true, monthly_rate: true, speed_mbps: true })
      document.getElementById(firstBad)?.focus()
      return
    }
    if (rateChanged) {
      setReviewOpen(true)
      return
    }
    savePlan()
  }

  const savePlan = async () => {
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
      setReviewOpen(false)
    }
  }

  // Archiving can be undone, so it happens straight away and the message offers an Undo button.
  const undoArchive = async (plan) => {
    try {
      await archiveApi.restorePlan(plan.plan_id)
      showToast(`"${plan.plan_name}" was restored.`)
      fetchPlans()
    } catch (err) {
      showToast(errorMessage(err, 'Could not undo. You can restore the plan from the Archive page.'), 'error')
    }
  }

  const archivePlan = async (plan) => {
    try {
      await api.delete(`/plans/${plan.plan_id}`)
      setPlans((prev) => prev.filter((p) => p.plan_id !== plan.plan_id))
      showToast(`"${plan.plan_name}" was archived. It is no longer offered for new subscribers; those already on it are still billed.`, 'success', {
        action: { label: 'Undo', onClick: () => undoArchive(plan) },
      })
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to archive plan.', 'error')
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
              <Skeleton className="h-8 w-28" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Service Plans</h1>
              <div className="flex gap-2">
                <TourButton tour="plans" />
                {canManage && <Button data-tour="plans-add" onClick={openAddModal} className="gap-2"><Plus className="size-4" aria-hidden="true" />Add Plan</Button>}
              </div>
            </>
          )}
        </div>
        <Skeleton className="mb-2 h-5 w-[34rem] max-w-full" />
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <TableSkeleton rows={5} columns={[
            { label: 'Name' }, { label: 'Rate' }, { label: 'Speed (Mbps)' }, { label: 'Description' },
            { label: 'Availability', kind: 'badge' }, { label: 'Actions', kind: 'actions' },
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
                {canManage && <Button data-tour="plans-add" onClick={openAddModal} className="gap-2"><Plus className="size-4" aria-hidden="true" />Add Plan</Button>}
              </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {plans.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <EmptyState
            icon={Wifi}
            title="No service plans yet"
            description="A plan is a monthly package with a rate and a speed. Add your plans first, so each subscriber can be given one."
            action={canManage ? { label: 'Add Plan', onClick: openAddModal } : undefined}
          />
        </div>
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
                <TableHead>Availability</TableHead>
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
                      {plan.status === 'Active' ? 'Offered' : 'Not offered'}
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
                        <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setArchiveTarget(plan)} aria-label={`Archive ${plan.plan_name}`}>
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
          setArchiveTarget(p)
        }}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Plan' : 'Add Plan'}
        description={editingId ? "Update this plan's details." : 'Set up a new service plan.'}
        size="md"
        confirmClose={JSON.stringify(form) !== JSON.stringify(formBaseline)}
        footer={(requestClose) => (
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" form="plan-form" disabled={saving} className="gap-2">
              <Save className="size-4" aria-hidden="true" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      >
        <form id="plan-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <RequiredNote />
            <TourButton tour="planForm" />
          </div>

          <FormField id="plan_name" label="Plan Name" required error={fieldError('plan_name')}>
            <Input name="plan_name" value={form.plan_name} onChange={handleChange} onBlur={handleBlur} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="monthly_rate" label="Monthly Rate" required hint="In pesos" error={fieldError('monthly_rate')}>
              <Input type="number" inputMode="decimal" step="0.01" min="0" name="monthly_rate" value={form.monthly_rate} onChange={handleChange} onBlur={handleBlur} />
            </FormField>

            <FormField id="speed_mbps" label="Speed (Mbps)" optional error={fieldError('speed_mbps')}>
              <Input type="number" min="0" name="speed_mbps" value={form.speed_mbps} onChange={handleChange} onBlur={handleBlur} />
            </FormField>
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
            <Label>Availability</Label>
            <Select value={form.status} onValueChange={setFieldValue('status')}>
              <SelectTrigger className="w-full" aria-label="Plan availability">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Offered to new subscribers</SelectItem>
                <SelectItem value="Inactive">Not offered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
      </Modal>

      <ConfirmAction
        open={!!archiveTarget}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null) }}
        title="Archive this plan?"
        description={
          archiveTarget && (
            <>
              <strong>"{archiveTarget.plan_name}"</strong> will no longer be offered to new subscribers. Subscribers already on it keep it and are still billed
              normally. You can restore it from the Archive page (or press Undo straight after).
            </>
          )
        }
        confirmLabel="Archive plan"
        busyLabel="Archiving..."
        destructive
        busy={archiving}
        onConfirm={async () => {
          setArchiving(true)
          await archivePlan(archiveTarget)
          setArchiving(false)
          setArchiveTarget(null)
        }}
      />

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        title="Change this plan's monthly rate?"
        description="The new rate applies from next month. Months already billed keep the price they had, so nothing already billed changes."
        rows={[
          { label: 'Plan', value: form.plan_name },
          { label: 'Current rate', value: editingPlan ? peso(editingPlan.monthly_rate) : '' },
          { label: 'New rate', value: peso(form.monthly_rate), emphasis: true },
        ]}
        confirmLabel="Change rate"
        busyLabel="Saving..."
        busy={saving}
        onConfirm={savePlan}
      />

    </div>
  )
}