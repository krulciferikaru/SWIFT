import { useEffect, useState } from 'react'
import api from '../api/axios'

export default function Dashboard() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    api.get('/me')
      .then((res) => setUser(res.data))
      .catch((err) => console.error(err))
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>

          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              window.location.href = '/login'
            }}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold">
            Welcome{user ? `, ${user.name}` : ''}!
          </h2>

          {user && (
            <div className="mt-4 space-y-2">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p><strong>Status:</strong> {user.account_status}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}