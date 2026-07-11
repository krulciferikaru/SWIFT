import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function Approvals() {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

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

  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      await api.patch(`/subscribers/${id}/approve`)
      setPending((prev) => prev.filter((subscriber) => subscriber.subscriber_id !== id))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve subscriber.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id) => {
    setActionLoading(id)
    try {
      await api.patch(`/subscribers/${id}/reject`)
      setPending((prev) => prev.filter((subscriber) => subscriber.subscriber_id !== id))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject subscriber.')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <p className="text-gray-500">Loading pending approvals...</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Pending Approvals</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {pending.length === 0 ? (
        <p className="text-gray-500">No pending subscribers.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Contact Number</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Registered On</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((subscriber) => (
                <tr key={subscriber.subscriber_id} className="border-t">
                  <td className="px-4 py-3">{subscriber.name}</td>
                  <td className="px-4 py-3">{subscriber.email}</td>
                  <td className="px-4 py-3">{subscriber.contact_number || '—'}</td>
                  <td className="px-4 py-3 capitalize">{subscriber.account_status}</td>
                  <td className="px-4 py-3">
                    {new Date(subscriber.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => handleApprove(subscriber.subscriber_id)}
                      disabled={actionLoading === subscriber.subscriber_id}
                      className="px-3 py-1 bg-green-600 text-white rounded-md text-xs hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(subscriber.subscriber_id)}
                      disabled={actionLoading === subscriber.subscriber_id}
                      className="px-3 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}