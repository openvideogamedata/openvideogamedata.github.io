import { api } from './client'

export interface FriendUserDto {
  id: number
  nickname: string
  fullName: string
  userPicture: string[] | null
}

export interface FriendDto {
  friendshipId: number
  friend: FriendUserDto
}

export interface FriendRequestDto {
  friendshipId: number
  requester: FriendUserDto
}

export interface FriendsResponse {
  friends: FriendDto[]
  receivedRequests: FriendRequestDto[]
  sentRequests: FriendRequestDto[]
}

// TrackStatus matches the C# enum: None=0, ToPlay=1, Playing=2, Beaten=3, Abandoned=4, Played=5
export type TrackStatus = 0 | 1 | 2 | 3 | 4 | 5

export interface FriendActivityItemDto {
  trackerId: number
  user: FriendUserDto
  gameId: number
  gameTitle: string
  coverImageUrl: string
  status: TrackStatus
  lastUpdateDate: string
  platinum: boolean
  note: string | null
}

export function getFriendsAndRequests(): Promise<FriendsResponse> {
  return api.get<FriendsResponse>('/api/friends/requests')
}

export function acceptRequest(friendshipId: number): Promise<void> {
  return api.post<void>(`/api/friends/requests/${friendshipId}/accept`, {})
}

export function declineRequest(friendshipId: number): Promise<void> {
  return api.delete<void>(`/api/friends/requests/${friendshipId}`)
}

export function removeFriend(friendshipId: number): Promise<void> {
  return api.delete<void>(`/api/friends/${friendshipId}`)
}

export function getFriendActivity(page = 1, pageSize = 20): Promise<FriendActivityItemDto[]> {
  return api.get<FriendActivityItemDto[]>(
    `/api/friends/activity?page=${page}&pageSize=${pageSize}`
  )
}
