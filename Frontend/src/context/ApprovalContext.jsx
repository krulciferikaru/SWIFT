import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/axios'

const ApprovalsContext = createContext(null)

export function ApprovalsProvider({ children }) {
  const [pendingCount, setPendingCount] = useState(0)

  const refreshPendingCount = useCallback(async () => {
    try {
      const res = await api.get('/subscribers/pending')
      setPendingCount(res.data?.length ?? 0)
    } catch {
      // silent — badge just won't update
    }
  }, [])

  return (
    <ApprovalsContext.Provider value={{ pendingCount, refreshPendingCount }}>
      {children}
    </ApprovalsContext.Provider>
  )
}

export function useApprovals() {
  const context = useContext(ApprovalsContext)
  if (!context) {
    throw new Error('useApprovals must be used within an ApprovalsProvider')
  }
  return context
}