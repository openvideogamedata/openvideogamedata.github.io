import { api } from './client'
import type { Pager } from '../types'

export interface GameRequestDto {
  id: number
  position: number
  gameTitle: string
  gameId: number
  firstReleaseDate: string | null
}

export interface GameListRequestDto {
  id: number
  sourceListUrl: string
  sourceName: string
  hostUrl: string
  finalGameListId: number
  finalGameList: { id: number; title: string; year: number | null; slug: string; fullName: string } | null
  score: number
  dateAdded: string
  userPostedId: number
  userPosted: { id: number; nickname: string; fullName: string } | null
  hidden: boolean
  likes: number
  dislikes: number
  games: GameRequestDto[]
}

export interface ValidateSourceUrlResponse {
  success: boolean
  reason: string
}

export interface CreateListSuggestionInput {
  sourceListUrl: string
  finalGameListId: number
  games: {
    position: number
    gameTitle: string
    gameId: number
    firstReleaseDate: string | null
  }[]
}

export interface ListSuggestionsResponse {
  requests: GameListRequestDto[]
  pager: Pager
}

export function getListSuggestions(
  page = 1,
  pageSize = 10,
  slug?: string,
  mine = false,
): Promise<ListSuggestionsResponse> {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (slug) qs.set('slug', slug)
  if (mine) qs.set('mine', 'true')
  return api.get<ListSuggestionsResponse>(`/api/list-suggestions?${qs}`)
}

export function validateSourceUrl(url: string): Promise<ValidateSourceUrlResponse> {
  return api.get<ValidateSourceUrlResponse>(`/api/list-suggestions/validate-source?url=${encodeURIComponent(url)}`)
}

export function createListSuggestion(body: CreateListSuggestionInput): Promise<{ success: boolean; reason?: string }> {
  return api.post<{ success: boolean; reason?: string }>('/api/list-suggestions', body)
}

export function likeRequest(id: number): Promise<void> {
  return api.post<void>(`/api/list-suggestions/${id}/like`, {})
}

export function dislikeRequest(id: number): Promise<void> {
  return api.post<void>(`/api/list-suggestions/${id}/dislike`, {})
}

export function approveRequest(id: number): Promise<{ success: boolean; message: string }> {
  return api.post(`/api/list-suggestions/${id}/approve`, {})
}

export function updateVisibility(id: number, visible: boolean): Promise<void> {
  return api.put<void>(`/api/list-suggestions/${id}/visibility`, { visible })
}

export function deleteRequest(id: number): Promise<void> {
  return api.delete<void>(`/api/list-suggestions/${id}`)
}
