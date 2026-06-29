import { useState, useEffect } from 'react'
import planApi from '../../api/plans'

const EMPTY_FORM = {
  plan_id: '',
  name: '',
  address: '',
  contact_number: '',
  email: '',
  mac_address: '',
  connection_date: '',
  status: 'Active',
}

export default function SubscriberForm({ initial = null, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM)
  const [plans, setPlans] = useState([])
  const [errors, setErrors] = useState({})

  useEffect(() => {
    planApi.getAll().then((res) => setPlans(res.data.data)).catch(() => {})
  }, [])

  // Sync form when initial changes (edit mode)
  useEffect(() => {
    if (initial) setForm(initial)
  }, [initial])

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    try {
      await onSubmit(form)
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
      }
    }
  }

  const field = (label, key, type = 'text', extra = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          errors[key] ? 'border-red-400' : 'border-gray-300'
        }`}
        {...extra}
      />
      {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key][0]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Plan */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Service Plan</label>
        <select
          value={form.plan_id}
          onChange={set('plan_id')}
          required
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.plan_id ? 'border-red-400' : 'border-gray-300'
          }`}
        >
          <option value="">Select a plan</option>
          {plans.map((p) => (
            <option key={p.plan_id} value={p.plan_id}>
              {p.plan_name} — ₱{Number(p.monthly_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </option>
          ))}
        </select>
        {errors.plan_id && <p className="text-red-500 text-xs mt-1">{errors.plan_id[0]}</p>}
      </div>

      {/* Name */}
      {field('Full Name', 'name', 'text', { required: true, placeholder: 'e.g. Juan Dela Cruz' })}

      {/* Address */}
      {field('Address', 'address', 'text', { required: true, placeholder: 'e.g. Palayan City, Nueva Ecija' })}

      {/* Contact Number */}
      {field('Contact Number', 'contact_number', 'text', { placeholder: '09XX-XXX-XXXX' })}

      {/* Email */}
      {field('Email Address', 'email', 'email', { required: true })}

      {/* MAC Address */}
      {field('MAC Address', 'mac_address', 'text', { placeholder: 'XX:XX:XX:XX:XX:XX' })}

      {/* Connection Date */}
      {field('Connection Date', 'connection_date', 'date', { required: true })}

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select
          value={form.status}
          onChange={set('status')}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Active">Active</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Disconnected">Disconnected</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
