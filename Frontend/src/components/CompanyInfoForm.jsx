import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useCompanyInfo, COMPANY_FIELDS } from '../hooks/useCompanyInfo'
import { errorMessage } from '../utils/errors'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const EMPTY = Object.fromEntries(COMPANY_FIELDS.map((f) => [f, '']))

const TEXT_FIELDS = [
  ['mobile', 'Mobile number', 'tel', '09XX-XXX-XXXX'],
  ['phone', 'Telephone', 'tel', '(044) 000-0000'],
  ['email', 'Email', 'email', 'name@example.com'],
  ['address', 'Office address', 'text', 'Street, barangay, Palayan City'],
  ['office_hours', 'Office hours', 'text', 'Monday to Saturday, 8 AM to 5 PM'],
]

/** Admin form for the contact details subscribers see on their dashboard and the sign-in page. */
export default function CompanyInfoForm({ showToast }) {
  const { info, loading, update } = useCompanyInfo()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (info) setForm(Object.fromEntries(COMPANY_FIELDS.map((f) => [f, info[f] ?? ''])))
  }, [info])

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const res = await api.put('/company-info', form)
      update(res.data.data)
      showToast(res.data.message)
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors ?? {})
      else showToast(errorMessage(err, 'Failed to save company information.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card data-tour="settings-company">
      <CardHeader>
        <CardTitle className="text-base">Company contact information</CardTitle>
        <CardDescription>
          Shown to subscribers on their dashboard and on the sign-in page, so they know how to reach the company
          about payments, refunds, reconnection and new accounts. Anything left empty is not shown.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TEXT_FIELDS.map(([field, label, type, placeholder]) => (
              <div key={field} className={`space-y-1.5 ${field === 'address' || field === 'office_hours' ? 'sm:col-span-2' : ''}`}>
                <Label htmlFor={`company-${field}`}>{label}</Label>
                <Input
                  id={`company-${field}`}
                  type={type}
                  value={form[field]}
                  onChange={set(field)}
                  placeholder={placeholder}
                  disabled={loading}
                  aria-invalid={errors[field] ? true : undefined}
                  aria-describedby={errors[field] ? `company-${field}-error` : undefined}
                />
                {errors[field] && (
                  <p id={`company-${field}-error`} role="alert" className="text-xs text-red-700 dark:text-red-400">
                    {errors[field][0]}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company-how_to_pay">How to pay</Label>
            <Textarea
              id="company-how_to_pay"
              rows={3}
              value={form.how_to_pay}
              onChange={set('how_to_pay')}
              placeholder="For example: pay your collector during their visit, pay at the office, or send GCash to 09XX-XXX-XXXX and show the receipt."
              disabled={loading}
              maxLength={1000}
            />
          </div>
          <Button type="submit" disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save contact information'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
