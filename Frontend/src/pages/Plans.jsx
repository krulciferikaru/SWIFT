import { useEffect, useState } from 'react'
import api from '../api/axios'
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
  const [deleteLoading, setDeleteLoading] = useState(false)

  const { toast, showToast } = useToast()

  const fetchPlans = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/plans')
      setPlans(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load plans.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

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
      showToast(`"${deleteTarget.plan_name}" was deleted.`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete plan.', 'error')
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading plans...</p>
  }

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md text-sm text-white ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Service Plans</h1>
        <Button onClick={openAddModal}>Add Plan</Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No plans yet.</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">{plan.plan_name}</TableCell>
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
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(plan)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(plan)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Plan' : 'Add Plan'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="plan_name">Plan Name</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="monthly_rate">Monthly Rate</Label>
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <span className="text-xs text-gray-400 dark:text-gray-500">{form.description.length}/200</span>
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

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={setFieldValue('status')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>You're about to delete <strong>"{deleteTarget.plan_name}"</strong>. If subscribers are currently assigned to this plan, this action may fail or affect their records. This cannot be undone.</>
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
              {deleteLoading ? 'Deleting...' : 'Delete Plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}