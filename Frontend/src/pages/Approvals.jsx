import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

export default function Approvals() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)

  const { toast, showToast } = useToast()

  const fetchPending = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/subscribers/pending')
      setPending(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending subscribers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const handleApprove = async (subscriber) => {
    setActionLoading(subscriber.subscriber_id)
    try {
      await api.patch(`/subscribers/${subscriber.subscriber_id}/approve`)
      setPending((prev) => prev.filter((s) => s.subscriber_id !== subscriber.subscriber_id))
      showToast(`${subscriber.name} approved.`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve subscriber.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    setActionLoading(rejectTarget.subscriber_id)
    try {
      await api.patch(`/subscribers/${rejectTarget.subscriber_id}/reject`)
      setPending((prev) => prev.filter((s) => s.subscriber_id !== rejectTarget.subscriber_id))
      showToast(`${rejectTarget.name}'s application was rejected.`)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject subscriber.', 'error')
    } finally {
      setActionLoading(null)
      setRejectTarget(null)
    }
  }

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading pending approvals...</p>
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

      <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Pending Approvals</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {pending.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No pending subscribers.</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Contact Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered On</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((subscriber) => (
                <TableRow key={subscriber.subscriber_id}>
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">{subscriber.name}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{subscriber.email}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{subscriber.contact_number || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900 capitalize">
                      {subscriber.account_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {new Date(subscriber.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(subscriber)}
                        disabled={actionLoading === subscriber.subscriber_id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRejectTarget(subscriber)}
                        disabled={actionLoading === subscriber.subscriber_id}
                      >
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this application?</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectTarget && (
                <>You're about to reject <strong>{rejectTarget.name}</strong>'s subscriber application. This cannot be undone, and they'll need to re-apply if this was a mistake.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}