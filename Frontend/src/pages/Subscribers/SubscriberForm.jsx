import { useState, useEffect } from 'react'
import planApi from '../../api/plans'
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
    planApi.getAll()
      .then((res) => {
        const responseData = res.data.data
        const list = Array.isArray(responseData) ? responseData : (responseData?.data ?? [])
        setPlans(list)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (initial) setForm(initial)
  }, [initial])

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setValue = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }))

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
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        value={form[key]}
        onChange={set(key)}
        className={errors[key] ? 'border-red-400' : ''}
        {...extra}
      />
      {errors[key] && <p className="text-red-500 text-xs">{errors[key][0]}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Plan */}
      <div className="space-y-1.5">
        <Label>Service Plan</Label>
        <Select value={form.plan_id} onValueChange={setValue('plan_id')}>
          <SelectTrigger className={errors.plan_id ? 'border-red-400 w-full' : 'w-full'}>
            <SelectValue placeholder="Select a plan" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((p) => (
              <SelectItem key={p.plan_id} value={String(p.plan_id)}>
                {p.plan_name} — ₱{Number(p.monthly_rate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.plan_id && <p className="text-red-500 text-xs">{errors.plan_id[0]}</p>}
      </div>

      {field('Full Name', 'name', 'text', { required: true, placeholder: 'e.g. Juan Dela Cruz' })}
      {field('Address', 'address', 'text', { required: true, placeholder: 'e.g. Palayan City, Nueva Ecija' })}
      {field('Contact Number', 'contact_number', 'text', { placeholder: '09XX-XXX-XXXX' })}
      {field('Email Address', 'email', 'email', { required: true })}
      {field('MAC Address', 'mac_address', 'text', { placeholder: 'XX:XX:XX:XX:XX:XX' })}
      {field('Connection Date', 'connection_date', 'date', { required: true })}

      {/* Status */}
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={setValue('status')}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Unpaid">Unpaid</SelectItem>
            <SelectItem value="Disconnected">Disconnected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}