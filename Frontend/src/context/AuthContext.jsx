import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useOnReconnect } from '../hooks/useOnline'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // True when we could not ask the server who is signed in (offline, or the server is down).
  // The saved login is kept, so a dropped connection does not sign anyone out.
  const [connectionError, setConnectionError] = useState(false)

  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await api.get('/me')
      setUser(res.data) // /api/me returns the raw User object
      setConnectionError(false)
    } catch (err) {
      if (err.isNetworkError || err.response?.status >= 500) {
        setConnectionError(true)
      } else {
        setConnectionError(false)
        setUser(null)
        localStorage.removeItem('token')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCurrentUser()
  }, [fetchCurrentUser])

  useOnReconnect(() => {
    if (connectionError) fetchCurrentUser()
  })

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    setUser(userData) // login response already includes { user }
  }

  const logout = async () => {
    try {
      await api.post('/logout')
    } catch {
      // proceed with local logout regardless
    } finally {
      localStorage.removeItem('token')
      setUser(null)
    }
  }

  // True when the signed-in user holds at least one of the given permissions.
  const can = (...permissions) =>
    permissions.some((p) => user?.effective_permissions?.includes(p))

  return (
    <AuthContext.Provider value={{ user, loading, connectionError, isAuthenticated: !!user, can, login, logout, refetch: fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}