import { api } from './client'
import type { GamesResponse, GameSummary } from '../types'

export interface GetGamesParams {
  page?: number
  pageSize?: number
  title?: string
  order?: number
}

export function getGames(params: GetGamesParams = {}): Promise<GamesResponse> {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.pageSize) qs.set('pageSize', String(params.pageSize))
  if (params.title) qs.set('title', params.title)
  if (params.order !== undefined) qs.set('order', String(params.order))
  return api.get<GamesResponse>(`/api/games?${qs}`)
}

export function searchGames(title: string, pageSize = 10): Promise<{ games: GameSummary[] }> {
  const qs = new URLSearchParams({ title, pageSize: String(pageSize) })
  return api.get(`/api/games/search?${qs}`)
}
