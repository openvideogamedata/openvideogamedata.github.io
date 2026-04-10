import { api } from './client'

export interface GameListItemDto {
  id: number
  position: number
  gameTitle: string
  gameId: number
  coverImageUrl: string | null
  score: number
}

export interface SourceDto {
  id: number
  name: string
  hostUrl: string
}

export interface UserSummaryDto {
  id: number
  nickname: string
  fullName: string
}

export interface FinalGameListSummaryDto {
  id: number
  title: string
  year: number | null
  slug: string
  fullName: string
}

export interface GameListDto {
  id: number
  byUser: boolean
  sourceListUrl: string | null
  dateAdded: string
  dateLastUpdated: string | null
  userContributed: UserSummaryDto | null
  source: SourceDto | null
  finalGameList: FinalGameListSummaryDto | null
  items: GameListItemDto[]
}

export interface FriendComparison {
  userComparingListId: number
  compatibilityPercentage: number
  coincidentGameIds: number[]
}

export interface SourceListResponse {
  list: GameListDto
  creator: string
  creatorNickname: string
  canEdit: boolean
  friendComparison: FriendComparison | null
}

export function getSourceList(id: number | string): Promise<SourceListResponse> {
  return api.get<SourceListResponse>(`/api/source-lists/${id}`)
}
