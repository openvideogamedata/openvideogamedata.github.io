import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import GameCard from '../components/GameCard'
import Paginator from '../components/Paginator'
import { getGames } from '../api/games'
import { TrackStatus, GamesOrder } from '../types'
import type { GameSummary, Pager } from '../types'
import './Games.css'

const TRACK_FILTERS: { label: string; value: TrackStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'To Play', value: TrackStatus.ToPlay },
  { label: 'Playing', value: TrackStatus.Playing },
  { label: 'Beaten', value: TrackStatus.Beaten },
  { label: 'Abandoned', value: TrackStatus.Abandoned },
  { label: 'Played', value: TrackStatus.Played },
]

const ORDER_OPTIONS: { label: string; value: GamesOrder }[] = [
  { label: 'Most cited', value: GamesOrder.ByLists },
  { label: 'Best ranked', value: GamesOrder.ByAvgPosition },
]

export default function Games() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTitle = searchParams.get('title') ?? ''
  const initialOrder = Number(searchParams.get('order') ?? GamesOrder.ByLists)
  const initialStatus = searchParams.get('trackStatus') !== null ? Number(searchParams.get('trackStatus')) : null

  const [games, setGames] = useState<GameSummary[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(initialTitle)
  const [activeTitle, setActiveTitle] = useState(initialTitle)
  const [order, setOrder] = useState(initialOrder)
  const [trackStatus, setTrackStatus] = useState<TrackStatus | null>(initialStatus as TrackStatus | null)
  const [page, setPage] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    getGames({
      page,
      pageSize: 24,
      title: activeTitle || undefined,
      order,
      trackStatus: trackStatus ?? undefined,
    }).then(res => {
      setGames(res.games)
      setPager(res.pager as Pager)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [page, activeTitle, order, trackStatus])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setActiveTitle(searchInput)
    const params: Record<string, string> = {}
    if (searchInput) params.title = searchInput
    if (order !== GamesOrder.ByLists) params.order = String(order)
    if (trackStatus !== null) params.trackStatus = String(trackStatus)
    setSearchParams(params)
  }

  function handleOrder(o: GamesOrder) {
    setOrder(o)
    setPage(1)
  }

  function handleTrackStatus(s: TrackStatus | null) {
    setTrackStatus(s)
    setPage(1)
  }

  function handlePageChange(p: number) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="games-page">
      <section className="games-header">
        <div className="container">
          <h1 className="page-title">Games Database</h1>
          <p className="page-subtitle">Browse every game ranked across community and critic lists</p>
        </div>
      </section>

      <div className="container games-body">
        <aside className="games-filters">
          {/* Search */}
          <form onSubmit={handleSearch} className="filter-search-form">
            <input
              ref={inputRef}
              className="filter-search-input"
              placeholder="Search games…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button type="submit" className="filter-search-btn">Go</button>
          </form>

          {/* Order */}
          <div className="filter-group">
            <p className="filter-label">Sort by</p>
            {ORDER_OPTIONS.map(o => (
              <button
                key={o.value}
                className={`filter-radio ${order === o.value ? 'active' : ''}`}
                onClick={() => handleOrder(o.value)}
              >
                <span className="radio-dot" />
                {o.label}
              </button>
            ))}
          </div>

          {/* Track status */}
          <div className="filter-group">
            <p className="filter-label">Status</p>
            {TRACK_FILTERS.map(f => (
              <button
                key={String(f.value)}
                className={`filter-radio ${trackStatus === f.value ? 'active' : ''}`}
                onClick={() => handleTrackStatus(f.value)}
              >
                <span className="radio-dot" />
                {f.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="games-main">
          {loading ? (
            <div className="games-grid">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="game-card-skeleton">
                  <div className="skeleton cover-skeleton" />
                  <div className="skeleton title-skeleton" />
                  <div className="skeleton meta-skeleton" />
                </div>
              ))}
            </div>
          ) : games.length > 0 ? (
            <>
              <div className="games-grid">
                {games.map(g => <GameCard key={g.id} game={g} />)}
              </div>
              {pager && <Paginator pager={pager} onPageChange={handlePageChange} />}
            </>
          ) : (
            <p className="no-results">No games found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
