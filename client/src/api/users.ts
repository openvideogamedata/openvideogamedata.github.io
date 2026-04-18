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
  isMember: boolean
  membershipStatus: string | null
  gamification: GamificationDto | null
}

export interface UserDashboardProfileDto {
  id: number
  nickname: string
  fullName: string
  userPicture: string[] | null
  needsNickname: boolean
  unreadNotifications: number
  friendsCount: number
  pendingFriendRequests: number
  badgesCount: number
  totalTrackers: number
  listsCreated: number
}

export interface UserDashboardStatDto {
  label: string
  value: string
  hint: string
  href: string
}

export interface UserDashboardChecklistItemDto {
  key: string
  title: string
  description: string
  href: string
  completed: boolean
}

export interface UserDashboardActionDto {
  title: string
  description: string
  href: string
  tone: 'primary' | 'accent' | 'neutral'
}

export interface UserDashboardActivityDto {
  type: string
  title: string
  description: string
  href: string
  date: string
}

export interface UserDashboardDto {
  profile: UserDashboardProfileDto
  stats: UserDashboardStatDto[]
  checklist: UserDashboardChecklistItemDto[]
  actions: UserDashboardActionDto[]
  recentActivity: UserDashboardActivityDto[]
}

export function getMe(): Promise<UserProfileDto> {
  return api.get<UserProfileDto>('/api/users/me')
}

export function getDashboard(): Promise<UserDashboardDto> {
  return api.get<UserDashboardDto>('/api/users/me/dashboard')
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
  return api.put<void>('/api/users/me/pixel-art', { pixelArt: matrix })
}

export function deleteAccount(): Promise<void> {
  return api.delete<void>('/api/users/me')
}
