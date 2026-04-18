import type { CredentialResponse } from '@react-oauth/google'
import { api } from './client'

export async function loginWithGoogle(credentialResponse: CredentialResponse): Promise<{ needsFill: boolean }> {
  if (!credentialResponse.credential) throw new Error('No credential in response')

  const result = await api.post<{ token: string; refreshToken: string; needsFill: boolean }>('/api/auth/google', {
    idToken: credentialResponse.credential
  })
  localStorage.setItem('token', result.token)
  localStorage.setItem('refreshToken', result.refreshToken)
  return { needsFill: result.needsFill }
}

export async function refreshAuthToken(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) throw new Error('No refresh token stored')

  const result = await api.post<{ token: string; refreshToken: string }>('/api/auth/refresh', { refreshToken })
  localStorage.setItem('token', result.token)
  localStorage.setItem('refreshToken', result.refreshToken)
}

export function logout(): void {
  const refreshToken = localStorage.getItem('refreshToken')
  if (refreshToken) {
    api.post('/api/auth/logout', { refreshToken }).catch(() => {})
  }
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
}

export function getToken(): string | null {
  return localStorage.getItem('token')
}
