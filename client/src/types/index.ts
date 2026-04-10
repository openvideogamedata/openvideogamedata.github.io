export interface Pager {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages: number
  maxPages: number
}

export interface GameSummary {
  id: number
  title: string
  firstReleaseDate: string
  releaseYear: number
  externalCoverImageId: string | null
  coverImageUrl: string
  coverBigImageUrl: string
  numberOfLists: number
  score: number | null
  tracker: Tracker | null
}

export interface Tracker {
  id: number
  userId: number
  gameId: number
  status: TrackStatus
  statusDate: string
  lastUpdateDate: string
  note: string | null
  platinum: boolean
}

export enum TrackStatus {
  None = 0,
  Completed = 1,
  Playing = 2,
  Dropped = 3,
  Wishlist = 4,
  Backlog = 5,
}

export interface GamesResponse {
  games: GameSummary[]
  pager: Pager
}

export interface GameListCategory {
  id: number
  name: string
  fullName: string
  slug: string
  year: number
  score: number | null
  numberOfGames: number
}

export interface TimelineGeneration {
  generation: number
  name: string
  lists: GameListCategory[]
}
