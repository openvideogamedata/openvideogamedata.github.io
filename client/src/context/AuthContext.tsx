import { createContext, useContext, useEffect, useState } from 'react'
import { getSession } from '../api/auth'
import { getMe } from '../api/users'
import type { UserProfileDto } from '../api/users'

interface AuthState {
  user: UserProfileDto | null
  loading: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthState>({ user: null, loading: true, isAdmin: false })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    getSession()
      .then(session => {
        if (!session.isAuthenticated) { setLoading(false); return }
        setIsAdmin(session.roles?.includes('admin') ?? false)
        return getMe().catch(() => null)
      })
      .then(profile => { if (profile) setUser(profile) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return <AuthContext.Provider value={{ user, loading, isAdmin }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
