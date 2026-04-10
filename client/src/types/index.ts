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
