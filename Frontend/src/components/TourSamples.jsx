import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// Illustrative content shown only while a tour is running and the page has
// nothing real to point at. It is inert, so nothing in it can be clicked.

export function ApprovalSample({ tab, claimsSubTab }) {
  const isClaims = tab === 'claims'
  const canDecide = isClaims ? claimsSubTab === 'pending' : tab === 'pending'

  return (
    <div
      aria-hidden="true"
      inert
      className="mt-4 overflow-hidden rounded-lg border-2 border-dashed border-primary/40 bg-white dark:bg-gray-800"
    >
      <div className="bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
        Sample only. Nothing is waiting here right now, this is what a real entry looks like.
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm">
          <p className="font-medium text-gray-900 dark:text-gray-100">Juan Dela Cruz</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">0917 000 0000 · juan@example.com</p>
          {isClaims && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              On file: Juan D. Cruz, Brgy. Example, Palayan City
            </p>
          )}
        </div>
        <div data-tour="approvals-row-actions" className="flex gap-2">
          {canDecide ? (
            <>
              <Button size="sm" className="bg-green-700 text-white hover:bg-green-800">
                Approve
              </Button>
              <Button size="sm" variant="destructive">
                Reject
              </Button>
            </>
          ) : (
            <Button size="sm" className="bg-green-700 text-white hover:bg-green-800">
              Re-approve
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function PaymentSample() {
  return (
    <div
      aria-hidden="true"
      inert
      className="space-y-4 rounded-lg border-2 border-dashed border-primary/40 p-4"
    >
      <p className="text-xs font-medium text-primary">
        Sample only. Search and pick a real subscriber to see their actual balance and form.
      </p>

      <Card data-tour="payments-balance">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Juan Dela Cruz</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Home Plus · 0917 000 0000</p>
            <Badge
              variant="outline"
              className="mt-2 border-yellow-200 bg-yellow-100 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-400"
            >
              Unpaid
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Balance due</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">₱1,200.00</p>
          </div>
        </CardContent>
      </Card>

      <Card data-tour="payments-form">
        <CardHeader>
          <CardTitle className="text-base">Record Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Amount" readOnly />
              <Input placeholder="OR number" readOnly />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Payment date" readOnly />
              <Input placeholder="Cash" readOnly />
            </div>
            <Button className="w-full">Record Payment</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
