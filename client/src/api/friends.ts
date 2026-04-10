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
