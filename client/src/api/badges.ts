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
