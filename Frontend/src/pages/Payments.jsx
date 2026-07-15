import { useState, useEffect, useCallback } from 'react'
import subscriberApi from '../api/subscribers'
import paymentsApi from '../api/payments'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
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
import { useToast } from '../hooks/useToast'
import { Search, CheckCircle2 } from 'lucide-react'

const MONTH_STATUS_STYLES = {
  paid: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
  partial: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  unpaid: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
}

const STATUS_BADGE_STYLES = {
  Active: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
  Unpaid: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  Disconnected: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900',
}

const EMPTY_FORM = {
  amount: '',
  payment_date: new Date().toISOString().slice(0, 10),
  or_number: '',
  payment_method: 'Cash',
  notes: '',
}

export default function Payments() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)

  const [billing, setBilling] = useState(null)
  const [history, setHistory] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [showReconnectConfirm, setShowReconnectConfirm] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  const { toast, showToast } = useToast()

  useEffect(() => {
    if (!search) {
      setResults([])
      return
    }
    setSearching(true)
    subscriberApi.getAll({ search, per_page: 8 })
      .then((res) => {
        const responseData = res.data.data
        const list = Array.isArray(responseData) ? responseData : (responseData?.data ?? [])
        setResults(list)
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false))
  }, [search])

  const loadDetail = useCallback(async (subscriber) => {
    setLoadingDetail(true)
    setBilling(null)
    setHistory([])
    try {
      const [billingRes, historyRes] = await Promise.all([
        paymentsApi.getBilling(subscriber.subscriber_id),
        paymentsApi.getHistory(subscriber.subscriber_id),
      ])
      setBilling(billingRes.data.data)
      setHistory(historyRes.data.data)
    } catch {
      showToast('Failed to load billing details.', 'error')
    } finally {
      setLoadingDetail(false)
    }
  }, [showToast])

  const selectSubscriber = (subscriber) => {
    setSelected(subscriber)
    setSearch('')
    setResults([])
    setForm(EMPTY_FORM)
    setErrors({})
    loadDetail(subscriber)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    try {
      const res = await paymentsApi.create(selected.subscriber_id, form)
      setBilling(res.data.data.billing)
      setForm(EMPTY_FORM)
      showToast('Payment recorded successfully.')
      const historyRes = await paymentsApi.getHistory(selected.subscriber_id)
      setHistory(historyRes.data.data)
      // Refresh subscriber's status badge in case it changed
      const fresh = await subscriberApi.getAll({ search: selected.email, per_page: 1 })
      const freshData = fresh.data.data
      const freshList = Array.isArray(freshData) ? freshData : (freshData?.data ?? [])
      if (freshList[0]) setSelected(freshList[0])
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
      } else {
        showToast(err.response?.data?.message || 'Failed to record payment.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmReconnect = async () => {
    setReconnecting(true)
    try {
      await subscriberApi.updateStatus(selected.subscriber_id, 'Active')
      setSelected({ ...selected, status: 'Active' })
      showToast(`${selected.name} has been reconnected.`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reconnect subscriber.', 'error')
    } finally {
      setReconnecting(false)
      setShowReconnectConfirm(false)
    }
  }

  const canReconnect = selected?.status === 'Disconnected' && billing?.months_behind === 0

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md text-sm text-white ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payments</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Search for a subscriber to view their balance and record a payment.
        </p>
      </div>

      {/* Subscriber search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or MAC address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {search && (
            <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
              {searching ? (
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : results.length === 0 ? (
                <p className="p-3 text-sm text-gray-400 dark:text-gray-500">No subscribers found.</p>
              ) : (
                results.map((s) => (
                  <button
                    key={s.subscriber_id}
                    onClick={() => selectSubscriber(s)}
                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.email}</p>
                  </button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <>
          {/* Subscriber summary */}
          <Card>
            <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selected.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selected.plan?.plan_name ?? 'No plan assigned'} · {selected.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={STATUS_BADGE_STYLES[selected.status]}>
                  {selected.status}
                </Badge>
                {canReconnect && (
                  <Button size="sm" onClick={() => setShowReconnectConfirm(true)}>
                    Reconnect Subscriber
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {loadingDetail ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardContent className="pt-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Months breakdown */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Billing Breakdown</CardTitle>
                  <CardDescription>
                    ₱{billing?.monthly_rate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}/month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Owed</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        ₱{billing?.total_owed.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Paid</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        ₱{billing?.total_paid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Balance</p>
                      <p className={`text-xl font-bold ${billing?.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        ₱{billing?.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {billing?.advance_credit > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded text-sm text-blue-700 dark:text-blue-400">
                      This subscriber has an advance credit of ₱{billing.advance_credit.toLocaleString('en-PH', { minimumFractionDigits: 2 })} applied toward future months.
                    </div>
                  )}

                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Applied</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {billing?.months.map((m) => (
                          <TableRow key={m.label}>
                            <TableCell className="text-gray-900 dark:text-gray-100">{m.label}</TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              ₱{m.due.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              ₱{m.applied.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`capitalize ${MONTH_STATUS_STYLES[m.status]}`}>
                                {m.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Record payment form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Record Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="amount">Amount<span className="text-red-500 ml-0.5">*</span></Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        value={form.amount}
                        onChange={handleChange}
                        required
                        className={errors.amount ? 'border-red-400' : ''}
                      />
                      {errors.amount && <p className="text-red-500 text-xs">{errors.amount[0]}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="payment_date">Payment Date<span className="text-red-500 ml-0.5">*</span></Label>
                      <Input
                        id="payment_date"
                        name="payment_date"
                        type="date"
                        value={form.payment_date}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="or_number">OR / Receipt Number<span className="text-red-500 ml-0.5">*</span></Label>
                      <Input
                        id="or_number"
                        name="or_number"
                        value={form.or_number}
                        onChange={handleChange}
                        required
                        placeholder="e.g. 41001"
                        className={errors.or_number ? 'border-red-400' : ''}
                      />
                      {errors.or_number && <p className="text-red-500 text-xs">{errors.or_number[0]}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Payment Method</Label>
                      <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="GCash">GCash</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder="Optional"
                      />
                    </div>

                    <Button type="submit" disabled={saving} className="w-full">
                      {saving ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Payment history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDetail ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">No payments recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>OR Number</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          {new Date(p.payment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400 font-mono text-xs">{p.or_number}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          ₱{Number(p.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{p.payment_method}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{p.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={showReconnectConfirm} onOpenChange={setShowReconnectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
              Reconnect this subscriber?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selected && (
                <>
                  <strong>{selected.name}</strong> has fully paid off their balance. Confirm that the physical
                  reconnection has been completed before marking their status as Active.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReconnect} disabled={reconnecting}>
              {reconnecting ? 'Reconnecting...' : 'Confirm Reconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}