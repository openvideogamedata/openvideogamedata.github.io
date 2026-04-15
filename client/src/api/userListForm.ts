import { api, getApiErrorMessage } from './client'

export interface ListOptionDto {
  id: number
  title: string
  slug: string
}
export interface ListYearOptionDto { id: number; year: number | null }

export interface GameSearchResult {
  id: number | null
  externalId: number
  title: string
  releaseYear: number
  coverImageUrl: string
  externalCoverImageId?: string | null
  firstReleaseDate: number
}

export interface GameItemInput {
  position: number
  gameTitle: string
  gameId: number
  firstReleaseDate: string | null
}

export interface UserListWriteRequest {
  finalGameListId: number
  games: GameItemInput[]
}

export function getListOptions(): Promise<ListOptionDto[]> {
  return api.get<ListOptionDto[]>('/api/trackers/list-options')
}

export function getListYearOptions(title: string): Promise<ListYearOptionDto[]> {
  return api.get<ListYearOptionDto[]>(`/api/trackers/list-year-options?title=${encodeURIComponent(title)}`)
}

export function searchGames(q: string, slug?: string): Promise<{ games: GameSearchResult[] }> {
  const qs = new URLSearchParams({ title: q, pageSize: '15' })
  if (slug) qs.set('slug', slug)
  return api.get<{ games: GameSearchResult[] }>(
    `/api/games/search?${qs.toString()}`,
  )
}

export async function materializeGameSearchResult(game: GameSearchResult): Promise<number> {
  const response = await api.post<{ id: number }>('/api/games/materialize-search-result', {
    externalId: game.externalId,
    title: game.title,
    firstReleaseDate: game.firstReleaseDate,
    externalCoverImageId: game.externalCoverImageId ?? null,
  })
  return response.id
}

export { getApiErrorMessage }

export function getUserListById(id: number) {
  return api.get<{
    id: number
    finalGameList: { id: number; title: string; year: number | null; fullName: string } | null
    items: { id: number; position: number; gameTitle: string; gameId: number }[]
  }>(`/api/user-lists/${id}`)
}

export function createUserList(req: UserListWriteRequest): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>('/api/user-lists', req)
}

export function updateUserList(id: number, req: UserListWriteRequest): Promise<{ success: boolean }> {
  return api.put<{ success: boolean }>(`/api/user-lists/${id}`, req)
}

export function deleteUserList(id: number): Promise<void> {
  return api.delete<void>(`/api/user-lists/${id}`)
}
