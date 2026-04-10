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

export interface ListSuggestionsResponse {
  requests: GameListRequestDto[]
  pager: Pager
}

export function getListSuggestions(
  page = 1,
  pageSize = 10,
  slug?: string,
): Promise<ListSuggestionsResponse> {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (slug) qs.set('slug', slug)
  return api.get<ListSuggestionsResponse>(`/api/list-suggestions?${qs}`)
}

export function likeRequest(id: number): Promise<void> {
  return api.post<void>(`/api/list-suggestions/${id}/like`, {})
}

export function dislikeRequest(id: number): Promise<void> {
  return api.post<void>(`/api/list-suggestions/${id}/dislike`, {})
}
