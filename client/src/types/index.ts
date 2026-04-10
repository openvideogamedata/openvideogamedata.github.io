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
  ToPlay = 1,
  Playing = 2,
  Beaten = 3,
  Abandoned = 4,
  Played = 5,
}

export enum GamesOrder {
  ByLists = 0,
  ByAvgPosition = 1,
  ByStatusDate = 2,
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
  title: string
  lists: GameListCategoryDto[]
}

export interface GameDetails {
  id: number
  title: string
  firstReleaseDate: string
  releaseYear: number
  externalId: number
  coverImageUrl: string
  coverBigImageUrl: string
  score: number
}

export interface Citation {
  id: number
  position: number
  score: number
  gameListId: number
  sourceListUrl: string | null
  sourceName: string | null
  finalGameListId: number | null
  finalGameListName: string | null
  finalGameListSlug: string | null
}

export interface GameDetailResponse {
  game: GameDetails
  tracker: Tracker | null
  friendsTrackers: { tracker: Tracker; user: { id: number; nickname: string; fullName: string; userPicture: string[] | null } | null }[]
  citationsSummary: {
    numberOfCategories: number
    mostCitedCategory: string
    mostCitedCategoryUrl: string
  }
}

export interface CitationsResponse {
  citations: Citation[]
  pager: Pager
  numberOfCategories: number
  mostCitedCategory: string
  mostCitedCategoryUrl: string
}

// Normalized type for ListCard — both HomeList and GameListCategoryDto map to this
export interface ListCardData {
  id: number
  title: string
  year: number | null
  numberOfGames: number
  numberOfSources: number
  slug: string
  topThreeWinners: { gameId: number; gameTitle: string; coverImageUrl: string }[]
}

// Search
export interface UserSummary {
  id: number
  nickname: string
  fullName: string
  userPicture: string[] | null
  contributions: number
}

export interface SearchResultSection<T> {
  items: T[]
  pager: Pager
}

export interface SearchResponse {
  input: string
  lists: SearchResultSection<GameListCategoryDto>
  games: SearchResultSection<GameSummary>
  users: SearchResultSection<UserSummary>
}

export interface GameListCategoryDto {
  id: number
  title: string
  year: number | null
  numberOfGames: number
  numberOfSources: number
  slug: string
  pinned: boolean
  topWinners: {
    gameId: number
    gameTitle: string
    coverImageUrl: string
    position: number
    score: number
  }[]
}

// Home-specific types
export interface HomeWinner {
  gameId: number
  gameTitle: string
  coverImageUrl: string
}

export interface HomeList {
  id: number
  title: string
  year: number | null
  numberOfGames: number
  numberOfSources: number
  slug: string
  topThreeWinners: HomeWinner[]
}

export enum ActivityType {
  GameList = 0,
  Tracker = 1,
}

export interface HomeUser {
  fullName: string
  userPicture: string[] | null
}

export interface HomeTracker {
  status: TrackStatus
}

export interface HomeActivity {
  activity: ActivityType
  dateAdded: string
  itemsTracked: number
  userProfileUrl: string
  gameListUrl: string
  user: HomeUser | null
  mostRecentTracker: HomeTracker | null
  gameListName: string | null
}

export interface HomeResponse {
  pinnedLists: HomeList[]
  userActivity: HomeActivity[]
  allTags: string[]
  listsCategories: HomeList[]
  pager: Pager
  filters: {
    page: number
    pageSize: number
    maxPages: number
    searchedText: string
    tags: string[]
  }
}
