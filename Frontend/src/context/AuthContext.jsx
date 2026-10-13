import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useOnReconnect } from '../hooks/useOnline'
import { getToken, setToken, clearToken } from '../utils/authToken'

const AuthContext = createContext(null)

// How often the open page tells the server it is still in use.
const KEEP_ALIVE_MS = 8 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // True when we could not ask the server who is signed in (offline, or the server is down).
  // The saved login is kept, so a dropped connection does not sign anyone out.
  const [connectionError, setConnectionError] = useState(false)

  const fetchCurrentUser = useCallback(async () => {
    const token = getToken()
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
        clearToken()
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

  // A normal sign-in lasts an hour after the last activity. Pinging the server every few
  // minutes while the page is open keeps it alive, so someone reading or typing is never
  // signed out, while a closed tab lets the sign-in lapse. A 401 here is handled by axios.
  const signedIn = !!user
  useEffect(() => {
    if (!signedIn) return undefined
    const ping = () => {
      if (navigator.onLine) api.get('/me').catch(() => {})
    }
    const timer = setInterval(ping, KEEP_ALIVE_MS)
    // A laptop that slept comes back with a stale timer; check straight away.
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [signedIn])

  const login = (token, userData, remember = false) => {
    setToken(token, remember)
    setUser(userData) // login response already includes { user }
  }

  const logout = async () => {
    try {
      await api.post('/logout')
    } catch {
      // proceed with local logout regardless
    } finally {
      clearToken()
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