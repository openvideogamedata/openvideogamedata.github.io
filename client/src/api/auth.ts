import { api } from './client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string

export interface SessionDto {
  isAuthenticated: boolean
  nameIdentifier?: string
  name?: string
  roles?: string[]
}

export function getSession(): Promise<SessionDto> {
  return api.get<SessionDto>('/api/auth/session')
}

export function login(returnUrl?: string) {
  const url = returnUrl ?? window.location.href
  window.location.href = `${BASE_URL}/api/auth/login?returnUrl=${encodeURIComponent(url)}`
}

export function logout() {
  const returnUrl = `${window.location.origin}${window.location.pathname}`
  window.location.href = `${BASE_URL}/api/auth/logout?returnUrl=${encodeURIComponent(returnUrl)}`
}
