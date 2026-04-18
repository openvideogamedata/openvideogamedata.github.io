import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { getMe } from '../api/users'
import { refreshAuthToken } from '../api/auth'
import type { UserProfileDto } from '../api/users'

interface AuthState {
  user: UserProfileDto | null
  loading: boolean
  isAdmin: boolean
  refresh: () => Promise<UserProfileDto | null>
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  isAdmin: false,
  refresh: async () => null,
})

interface JwtPayload {
  exp: number
  role?: string | string[]
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[]
}

function getTokenPayload(): JwtPayload | null {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const decoded = jwtDecode<JwtPayload>(token)
    if (decoded.exp * 1000 <= Date.now()) {
      localStorage.removeItem('token')
      return null
    }
    return decoded
  } catch {
    return null
  }
}

function hasRole(payload: JwtPayload, role: string): boolean {
  const values = [
    payload.role,
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
  ]

  return values.some(value => Array.isArray(value) ? value.includes(role) : value === role)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const load = useCallback(async (): Promise<UserProfileDto | null> => {
    let payload = getTokenPayload()
    if (!payload) {
      try {
        await refreshAuthToken()
        payload = getTokenPayload()
      } catch { /* */ }
      if (!payload) {
        setUser(null)
        setIsAdmin(false)
        setLoading(false)
        return null
      }
    }

    setIsAdmin(hasRole(payload, 'admin'))
    setLoading(true)
    try {
      const profile = await getMe()
      setUser(profile)
      return profile
    } catch {
      localStorage.removeItem('token')
      setUser(null)
      setIsAdmin(false)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, refresh: load }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
