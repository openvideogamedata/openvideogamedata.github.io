import { api } from './client'

export interface TopContributorDto {
  id: number
  nickname: string
  fullName: string
  userPicture: string[] | null
  contributions: number
}

export interface BadgeDto {
  id: number
  name: string
  description: string
  pixelArt: string[] | null
  priority: number
  automaticallyGiven: boolean
}

export interface GamificationDto {
  karma: number
  contributions: number
  topList: string
  topListSlug: string
  rank: number
  badges: BadgeDto[]
}

export interface UserProfileDto {
  id: number
  nickname: string
  fullName: string
  userPicture: string[] | null
  isLoggedUser: boolean
  hasNotifications: boolean
  alreadyFriend: boolean
  alreadyRequestedFriend: boolean
  loadedFriendship: boolean
  gamification: GamificationDto | null
}

export function getMe(): Promise<UserProfileDto> {
  return api.get<UserProfileDto>('/api/users/me')
}

export function getTopContributors(): Promise<TopContributorDto[]> {
  return api.get<TopContributorDto[]>('/api/users/top-contributors')
}

export function getUserProfile(nickname: string): Promise<UserProfileDto> {
  return api.get<UserProfileDto>(`/api/users/${encodeURIComponent(nickname)}`)
}

export function sendFriendRequest(nickname: string): Promise<void> {
  return api.post<void>(`/api/users/${encodeURIComponent(nickname)}/friend-requests`, {})
}

export function checkNicknameAvailability(nickname: string): Promise<{ available: boolean }> {
  return api.get<{ available: boolean }>(`/api/users/nickname-availability?nickname=${encodeURIComponent(nickname)}`)
}

export function updateNickname(nickname: string): Promise<void> {
  return api.put<void>('/api/users/me/nickname', { nickname })
}

export function updatePixelArt(matrix: string[]): Promise<void> {
  return api.put<void>('/api/users/me/pixel-art', { matrix })
}

export function deleteAccount(): Promise<void> {
  return api.delete<void>('/api/users/me')
}
