import { createContext, useContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { getMe } from '../api/users'
import type { UserProfileDto } from '../api/users'

interface AuthState {
  user: UserProfileDto | null
  loading: boolean
  isAdmin: boolean
  refresh: () => void
}

const AuthContext = createContext<AuthState>({ user: null, loading: true, isAdmin: false, refresh: () => {} })

interface JwtPayload {
  exp: number
  role?: string
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  function load() {
    const payload = getTokenPayload()
    if (!payload) {
      setUser(null)
      setIsAdmin(false)
      setLoading(false)
      return
    }

    setIsAdmin(payload.role === 'admin')
    setLoading(true)
    getMe()
      .then(profile => { setUser(profile) })
      .catch(() => {
        localStorage.removeItem('token')
        setUser(null)
        setIsAdmin(false)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, refresh: load }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
