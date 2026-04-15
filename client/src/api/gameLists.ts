import { api } from './client'
import { getCriticListsFromCache, getUserListsFromCache, getListBySlugFromCache } from './localCache'

export interface TrackerStats {
  toPlay: number
  playing: number
  played: number
  beated: number
  abandoned: number
  none: number
}

export interface TopWinnerDto {
  gameId: number
  gameTitle: string
  trackStatus: number
  citations: number
  porcentageOfCitations: number
  firstReleaseDate: string
  releaseYear: number
  coverImageUrl: string
  score: number
  position: number
  gameListId: number
  finalGameListId: number | null
}

export interface SourceListDto {
  sourceName: string
  sourceUrl: string
  sourceDateLastUpdated: string | null
  year: number | null
}

export interface ContributorDto {
  userContributedId: number
  fullName: string
  nickname: string
  numberOfContributions: number
  porcentageOfContributions: number
}

export interface FinalGameListDetailsDto {
  id: number
  title: string
  year: number | null
  slug: string
  fullName: string
  socialUrl: string | null
  socialComments: number
  tags: string
  tagList: string[]
  consideredForAvgScore: boolean
  pinned: boolean
  pinnedPriority: number
  similarLists: SourceListDto[]
}

export interface GameListDetailsResponse {
  finalGameList: FinalGameListDetailsDto
  topWinnersByCritics: TopWinnerDto[]
  trackerStatsCritics: TrackerStats
  topWinnersByUsers: TopWinnerDto[]
  trackerStatsUsers: TrackerStats
  sources: SourceListDto[]
  numberOfUsersLists: number
  contributors: ContributorDto[]
}

export interface GameListItemDto {
  id: number
  position: number
  gameTitle: string
  gameId: number
  coverImageUrl: string | null
  score: number
}

export interface SourceGameListDto {
  id: number
  byUser: boolean
  sourceListUrl: string | null
  dateAdded: string
  dateLastUpdated: string | null
  userContributed: { id: number; nickname: string; fullName: string } | null
  source: { id: number; name: string; hostUrl: string } | null
  finalGameList: { id: number; title: string; year: number | null; slug: string; fullName: string } | null
  items: GameListItemDto[]
}

export interface GameListCollectionResponse {
  lists: SourceGameListDto[]
  pager: {
    currentPage: number
    pageSize: number
    totalItems: number
    totalPages: number
    maxPages: number
  }
}

export async function getListBySlug(slug: string): Promise<GameListDetailsResponse> {
  const cached = await getListBySlugFromCache(slug)
  if (cached) return cached
  return api.get<GameListDetailsResponse>(`/api/game-lists/${slug}`)
}

export function getListBySlugLive(slug: string): Promise<GameListDetailsResponse> {
  return api.get<GameListDetailsResponse>(`/api/game-lists/${slug}`)
}

export async function getCriticLists(slug: string, page = 1, pageSize = 3): Promise<GameListCollectionResponse> {
  const cached = await getCriticListsFromCache(slug, page, pageSize)
  if (cached) return cached
  return api.get<GameListCollectionResponse>(`/api/game-lists/${slug}/critic-lists?page=${page}&pageSize=${pageSize}`)
}

export async function getUserLists(slug: string, page = 1, pageSize = 5): Promise<GameListCollectionResponse> {
  const cached = await getUserListsFromCache(slug, page, pageSize)
  if (cached) return cached
  return api.get<GameListCollectionResponse>(`/api/game-lists/${slug}/user-lists?page=${page}&pageSize=${pageSize}`)
}

export interface UpdateMasterListRequest {
  title: string
  year: number | null
  socialUrl: string | null
  tags: string
  consideredForAvgScore: boolean
  pinned: boolean
  pinnedPriority: number
  socialComments: number
}

export function updateMasterList(id: number, body: UpdateMasterListRequest): Promise<void> {
  return api.put<void>(`/api/game-lists/${id}`, body)
}

export function updateAvgConsideration(id: number, considered: boolean): Promise<void> {
  return api.put<void>(`/api/game-lists/${id}/avg-consideration`, { consideredForAvgScore: considered })
}
