import { api } from './client'

export interface MembershipCheckoutSession {
  checkoutSessionId: string
  url: string
}

export function createMembershipCheckoutSession(): Promise<MembershipCheckoutSession> {
  return api.post<MembershipCheckoutSession>('/api/membership/checkout-session', {})
}
