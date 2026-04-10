import { api } from './client'

export interface BadgeDto {
  id: number
  name: string
  description: string
  pixelArt: string[] | null
  priority: number
  automaticallyGiven: boolean
}

export interface BadgesResponse {
  badges: BadgeDto[]
  userBadges: BadgeDto[]
  isAdmin: boolean
}

export function getBadges(): Promise<BadgesResponse> {
  return api.get<BadgesResponse>('/api/badges')
}

export function createBadge(data: { name: string; description: string; pixelArt: string; automaticallyGiven: boolean; priority: number }): Promise<void> {
  return api.post<void>('/api/badges', data)
}

export function updateBadge(id: number, data: { name: string; description: string; pixelArt: string; automaticallyGiven: boolean; priority: number }): Promise<void> {
  return api.put<void>(`/api/badges/${id}`, data)
}

export function updateBadgePixelArt(id: number, matrix: string[]): Promise<void> {
  return api.put<void>(`/api/badges/${id}/pixel-art`, { pixelArt: JSON.stringify(matrix) })
}

export function assignBadge(badgeId: number, userId: number, notifyUser: boolean): Promise<void> {
  return api.post<void>(`/api/badges/${badgeId}/assign`, { userId, notifyUser })
}

export function unassignBadge(badgeId: number, userId: number): Promise<void> {
  return api.delete<void>(`/api/badges/${badgeId}/assign/${userId}`)
}
