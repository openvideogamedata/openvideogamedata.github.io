import { api } from './client'
import type { GamesResponse, GameDetailResponse, CitationsResponse, Tracker } from '../types'

export interface GetGamesParams {
  page?: number
  pageSize?: number
  title?: string
  order?: number
  trackStatus?: number
  onlyTracked?: boolean
}

export interface UpdateTrackerRequest {
  status: number
  note?: string | null
  statusDate?: string | null
  platinum?: boolean
}

export function getGames(params: GetGamesParams = {}): Promise<GamesResponse> {
  const qs = new URLSearchParams()
  qs.set('page', String(params.page ?? 1))
  qs.set('pageSize', String(params.pageSize ?? 24))
  if (params.title) qs.set('title', params.title)
  if (params.order !== undefined) qs.set('order', String(params.order))
  if (params.trackStatus !== undefined) qs.set('trackStatus', String(params.trackStatus))
  if (params.onlyTracked) qs.set('onlyTracked', 'true')
  return api.get<GamesResponse>(`/api/games?${qs}`)
}

export function getGame(id: number): Promise<GameDetailResponse> {
  return api.get<GameDetailResponse>(`/api/games/${id}`)
}

export function getCitations(id: number, page = 1, pageSize = 10): Promise<CitationsResponse> {
  return api.get<CitationsResponse>(`/api/games/${id}/citations?page=${page}&pageSize=${pageSize}`)
}

export function updateTracker(gameId: number, data: UpdateTrackerRequest): Promise<Tracker> {
  return api.put<Tracker>(`/api/games/${gameId}/tracker`, data)
}

export function removeTrackerStatus(gameId: number): Promise<Tracker> {
  return api.delete<Tracker>(`/api/games/${gameId}/tracker`)
}
