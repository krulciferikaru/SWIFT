import { useEffect, useState } from 'react'
import api from '../api/axios'

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormErrors({})

    try {
      if (editingId) {
        await api.patch(`/plans/${editingId}`, form)
      } else {
        await api.post('/plans', form)
      }
      setShowModal(false)
      fetchPlans()
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors)
      } else {
        setError(err.response?.data?.message || 'Failed to save plan.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (planId) => {
    if (!confirm('Delete this plan?')) return
    try {
      await api.delete(`/plans/${planId}`)
      setPlans((prev) => prev.filter((p) => p.plan_id !== planId))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete plan.')
    }
  }

  if (loading) {
    return <p className="text-gray-500">Loading plans...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Service Plans</h1>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          Add Plan
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-gray-500">No plans yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Speed (Mbps)</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.plan_id} className="border-t">
                  <td className="px-4 py-3">{plan.plan_name}</td>
                  <td className="px-4 py-3">₱{Number(plan.monthly_rate).toFixed(2)}</td>
                  <td className="px-4 py-3">{plan.speed_mbps || '—'}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{plan.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      plan.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="px-3 py-1 bg-gray-600 text-white rounded-md text-xs hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(plan.plan_id)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? 'Edit Plan' : 'Add Plan'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                <input
                  name="plan_name"
                  value={form.plan_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.plan_name && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.plan_name[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  name="monthly_rate"
                  value={form.monthly_rate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.monthly_rate && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.monthly_rate[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Speed (Mbps)</label>
                <input
                  type="number"
                  name="speed_mbps"
                  value={form.speed_mbps}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}