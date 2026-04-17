import type { CredentialResponse } from '@react-oauth/google'
import { api } from './client'

export async function loginWithGoogle(credentialResponse: CredentialResponse): Promise<{ needsFill: boolean }> {
  if (!credentialResponse.credential) throw new Error('No credential in response')

  const result = await api.post<{ token: string; needsFill: boolean }>('/api/auth/google', {
    idToken: credentialResponse.credential
  })
  localStorage.setItem('token', result.token)
  return { needsFill: result.needsFill }
}

export async function refreshAuthToken(): Promise<{ needsFill: boolean }> {
  const result = await api.post<{ token: string; needsFill: boolean }>('/api/auth/refresh', {})
  localStorage.setItem('token', result.token)
  return { needsFill: result.needsFill }
}

export function logout(): void {
  localStorage.removeItem('token')
}

export function getToken(): string | null {
  return localStorage.getItem('token')
}
