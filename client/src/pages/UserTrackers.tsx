import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { getUserProfile } from '../api/users'
import type { UserProfileDto } from '../api/users'
import TabBar from '../components/TabBar'
import Paginator from '../components/Paginator'
import type { Pager } from '../types'
import { GamesOrder, TrackStatus } from '../types'
import './UserTrackers.css'

interface TrackFilterDto {
  trackStatus: number
  trackStatusCount: number
}

interface TrackerSummary {
  status: number
  statusDate: string
}

interface GameSummaryDto {
  id: number
  title: string
  firstReleaseDate: string
  coverImageUrl: string | null
  coverBigImageUrl: string | null
  tracker: TrackerSummary | null
}

interface GamesResponse {
  games: GameSummaryDto[]
  pager: Pager
}

interface TrackerStats {
  toPlay: number
  playing: number
  played: number
  beated: number
  abandoned: number
  none: number
}

interface ComparisonResponse {
  slug: string
  userStats: TrackerStats
  visitorStats: TrackerStats
  topWinnersCount: number
}

interface ListOptionDto { id: number; title: string }
interface ListYearOptionDto { id: number; year: number | null }

const STATUS_META: Record<number, { label: string; color: string }> = {
  0: { label: 'None',      color: '#4b5563' },
  1: { label: 'To Play',   color: '#7c3aed' },
  2: { label: 'Playing',   color: '#06b6d4' },
  3: { label: 'Beaten',    color: '#10b981' },
  4: { label: 'Abandoned', color: '#ef4444' },
  5: { label: 'Played',    color: '#f59e0b' },
}

export default function UserTrackers() {
  const { nickname } = useParams<{ nickname: string }>()

  const [stats, setStats] = useState<TrackFilterDto[]>([])
  const [profile, setProfile] = useState<UserProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Tracker tab state
  const [activeStatus, setActiveStatus] = useState<number | null>(null)
  const [games, setGames] = useState<GameSummaryDto[]>([])
  const [gamesPager, setGamesPager] = useState<Pager | null>(null)
  const [gamesLoading, setGamesLoading] = useState(false)
  const [trackerYear, setTrackerYear] = useState<number | null>(null)
  const [availableTrackerYears, setAvailableTrackerYears] = useState<number[] | null>(null)

  // Compare tab state
  const [activeTab, setActiveTab] = useState<'trackers' | 'compare'>('trackers')
  const [listOptions, setListOptions] = useState<ListOptionDto[]>([])
  const [yearOptions, setYearOptions] = useState<ListYearOptionDto[]>([])
  const [selectedListTitle, setSelectedListTitle] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [yearDisabled, setYearDisabled] = useState(true)
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  useEffect(() => {
    if (!nickname) return
    Promise.all([
      api.get<TrackFilterDto[]>(`/api/users/${encodeURIComponent(nickname)}/tracker-stats`),
      getUserProfile(nickname),
    ])
      .then(([trackerStats, prof]) => {
        setStats(trackerStats)
        setProfile(prof)
        // Default to first non-None status
        const first = trackerStats.find(s => s.trackStatus !== 0)
        if (first) setActiveStatus(first.trackStatus)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [nickname])

  // Fetch available years when status changes
  useEffect(() => {
    if (activeStatus === null || !nickname) return
    if (shouldShowYearFilter(activeStatus)) {
      setAvailableTrackerYears(null)
      api.get<number[]>(`/api/users/${encodeURIComponent(nickname)}/tracker-years?trackStatus=${activeStatus}`)
        .then(years => {
          setAvailableTrackerYears(years)
          setTrackerYear(years.length > 0 ? years[0] : null)
        })
        .catch(() => {
          setAvailableTrackerYears([])
          setTrackerYear(null)
        })
    } else {
      setAvailableTrackerYears([])
      setTrackerYear(null)
    }
  }, [activeStatus, nickname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load games when status/year are ready
  useEffect(() => {
    if (activeStatus === null || !nickname) return
    if (shouldShowYearFilter(activeStatus) && availableTrackerYears === null) return
    loadGames(activeStatus, 1)
  }, [activeStatus, nickname, trackerYear, availableTrackerYears]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load list options when switching to Compare tab
  useEffect(() => {
    if (activeTab !== 'compare' || listOptions.length > 0) return
    api.get<ListOptionDto[]>('/api/trackers/list-options')
      .then(setListOptions)
      .catch(() => {})
  }, [activeTab, listOptions.length])

  function loadGames(status: number, page: number) {
    if (!nickname) return
    setGamesLoading(true)
    const qs = new URLSearchParams({
      trackStatus: String(status),
      page: String(page),
      pageSize: '24',
      order: String(GamesOrder.ByStatusDate),
    })
    if (shouldShowYearFilter(status) && trackerYear) {
      qs.set('trackerYear', String(trackerYear))
    }
    api.get<GamesResponse>(
      `/api/users/${encodeURIComponent(nickname)}/games?${qs}`
    )
      .then(res => { setGames(res.games); setGamesPager(res.pager) })
      .catch(() => {})
      .finally(() => setGamesLoading(false))
  }

  async function handleListSelect(title: string) {
    setSelectedListTitle(title)
    setSelectedYear(null)
    setComparison(null)
    setYearDisabled(true)

    if (!title) return

    const years = await api.get<ListYearOptionDto[]>(
      `/api/trackers/list-year-options?title=${encodeURIComponent(title)}`
    ).catch(() => [] as ListYearOptionDto[])

    setYearOptions(years)

    const allNull = years.every(y => y.year === null)
    if (allNull || years.length === 0) {
      // No year selection needed — compare immediately
      setYearDisabled(true)
      runComparison(title, null)
    } else {
      setYearDisabled(false)
    }
  }

  function handleYearSelect(yearStr: string) {
    const year = yearStr ? Number(yearStr) : null
    setSelectedYear(year)
    if (selectedListTitle) runComparison(selectedListTitle, year)
  }

  function runComparison(title: string, year: number | null) {
    if (!nickname) return
    setCompareLoading(true)
    setComparison(null)
    const qs = new URLSearchParams({ listTitle: title })
    if (year) qs.set('year', String(year))
    api.get<ComparisonResponse>(`/api/users/${encodeURIComponent(nickname)}/trackers/compare?${qs}`)
      .then(setComparison)
      .catch(() => {})
      .finally(() => setCompareLoading(false))
  }

  const total = stats.reduce((sum, s) => sum + s.trackStatusCount, 0)
  const visibleStats = stats.filter(s => s.trackStatus !== 0)
  const showCompareTabs = !!profile && !profile.isLoggedUser && profile.alreadyFriend

  if (notFound) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>User not found</h2>
      </div>
    )
  }

  return (
    <div className="user-trackers-page">
      <section className="user-trackers-header">
        <div className="container">
          <Link to={`/users/${nickname}`} className="back-link">← @{nickname}</Link>
          <h1 className="page-title">
            {profile ? `${profile.fullName}'s Trackers` : `Trackers — ${nickname}`}
          </h1>
          {!loading && (
            <p className="page-subtitle">{total} game{total !== 1 ? 's' : ''} tracked</p>
          )}
        </div>
      </section>

      <div className="container user-trackers-body">
        {loading ? (
          <TrackersSkeleton />
        ) : stats.length === 0 ? (
          <p className="empty-state">No games tracked yet.</p>
        ) : (
          <>
            {showCompareTabs && (
              <TabBar
                tabs={[
                  { key: 'trackers', label: 'Trackers' },
                  { key: 'compare', label: 'Compare' },
                ]}
                active={activeTab}
                onChange={v => setActiveTab(v as 'trackers' | 'compare')}
              />
            )}

            {/* ── Trackers tab ── */}
            {activeTab === 'trackers' && (
              <>
                {/* Progress bar */}
                <div className="tracker-progress-bar">
                  {visibleStats.map(s => (
                    <div
                      key={s.trackStatus}
                      className="tracker-progress-segment"
                      style={{
                        width: `${(s.trackStatusCount / total) * 100}%`,
                        background: STATUS_META[s.trackStatus].color,
                      }}
                      title={`${STATUS_META[s.trackStatus].label}: ${s.trackStatusCount}`}
                    />
                  ))}
                </div>

                {/* Status filter pills */}
                <div className="tracker-filter-pills">
                  {visibleStats.map(s => {
                    const meta = STATUS_META[s.trackStatus]
                    const active = activeStatus === s.trackStatus
                    return (
                      <button
                        key={s.trackStatus}
                        className={`tracker-pill ${active ? 'active' : ''}`}
                        style={active ? { background: meta.color, borderColor: meta.color } : { borderColor: `${meta.color}66` }}
                        onClick={() => {
                          setActiveStatus(s.trackStatus)
                          setTrackerYear(null)
                        }}
                      >
                        <span className="tracker-pill-dot" style={{ background: meta.color }} />
                        {meta.label}
                        <span className="tracker-pill-count">{s.trackStatusCount}</span>
                      </button>
                    )
                  })}
                </div>

                {activeStatus !== null && shouldShowYearFilter(activeStatus) && (
                  <div className="tracker-toolbar">
                    <label className="tracker-year-label" htmlFor="tracker-year">
                      Games marked in
                    </label>
                    <select
                      id="tracker-year"
                      className="tracker-year-select"
                      value={trackerYear ?? ''}
                      onChange={e => setTrackerYear(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">All years</option>
                      {(availableTrackerYears ?? []).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Games grid */}
                {activeStatus !== null && (
                  <div className="tracker-games-section">
                    {gamesLoading ? (
                      <GamesSkeleton />
                    ) : games.length === 0 ? (
                      <p className="empty-state">No games here yet.</p>
                    ) : (
                      <>
                        <div className="tracker-games-grid">
                          {games.map(g => (
                            <GameTrackerCard key={g.id} game={g} />
                          ))}
                        </div>
                        {gamesPager && gamesPager.totalPages > 1 && (
                          <Paginator
                            pager={gamesPager}
                            onPageChange={p => loadGames(activeStatus, p)}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Compare tab ── */}
            {activeTab === 'compare' && profile && (
              <div className="compare-section">
                <div className="compare-selectors">
                  <div className="compare-field">
                    <label className="compare-label">Select a list</label>
                    <select
                      className="compare-select"
                      value={selectedListTitle}
                      onChange={e => handleListSelect(e.target.value)}
                    >
                      <option value=""> — </option>
                      {listOptions.map(o => (
                        <option key={o.id} value={o.title}>{o.title}</option>
                      ))}
                    </select>
                  </div>

                  {!yearDisabled && yearOptions.length > 0 && (
                    <div className="compare-field">
                      <label className="compare-label">Select a year</label>
                      <select
                        className="compare-select"
                        value={selectedYear ?? ''}
                        onChange={e => handleYearSelect(e.target.value)}
                      >
                        <option value=""> — </option>
                        {yearOptions.map(y => (
                          <option key={y.id} value={y.year ?? ''}>{y.year ?? 'All-time'}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {compareLoading && <p className="empty-state">Loading comparison…</p>}

                {comparison && !compareLoading && (
                  <div className="compare-results">
                    <CompareStatsBlock
                      label={profile.fullName}
                      stats={comparison.userStats}
                      total={comparison.topWinnersCount}
                    />
                    <CompareStatsBlock
                      label="You"
                      stats={comparison.visitorStats}
                      total={comparison.topWinnersCount}
                    />
                  </div>
                )}

                {!selectedListTitle && !compareLoading && (
                  <p className="empty-state">Select a list to compare your tracking progress.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function GameTrackerCard({ game }: { game: GameSummaryDto }) {
  const cover = game.coverBigImageUrl ?? game.coverImageUrl
  const year = game.firstReleaseDate
    ? new Date(game.firstReleaseDate).getFullYear()
    : null

  const rawStatusDate = game.tracker?.statusDate
  const formattedStatusDate = rawStatusDate && !rawStatusDate.startsWith('0001')
    ? new Date(rawStatusDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    : null

  return (
    <Link to={`/games/${game.id}`} className="tracker-game-card">
      <div className="tracker-game-cover-wrap">
        {cover ? (
          <img src={cover} alt={game.title} className="tracker-game-cover" loading="lazy" />
        ) : (
          <div className="tracker-game-cover tracker-game-cover-ph" />
        )}
      </div>
      <span className="tracker-game-title">{game.title}</span>
      {year && <span className="tracker-game-year">{year}</span>}
      {formattedStatusDate && <span className="tracker-game-status-date">{formattedStatusDate}</span>}
    </Link>
  )
}

function shouldShowYearFilter(status: number): boolean {
  return status !== TrackStatus.ToPlay && status !== TrackStatus.Playing && status !== TrackStatus.None
}


function CompareStatsBlock({ label, stats, total }: { label: string; stats: TrackerStats; total: number }) {
  const STATUS_COMPARE = [
    { key: 'beated',    label: 'Beaten',    color: '#10b981', value: stats.beated },
    { key: 'played',    label: 'Played',    color: '#f59e0b', value: stats.played },
    { key: 'playing',   label: 'Playing',   color: '#06b6d4', value: stats.playing },
    { key: 'toPlay',    label: 'To Play',   color: '#7c3aed', value: stats.toPlay },
    { key: 'abandoned', label: 'Abandoned', color: '#ef4444', value: stats.abandoned },
    { key: 'none',      label: 'Not tracked', color: '#4b5563', value: stats.none },
  ].filter(s => s.value > 0)

  const tracked = stats.beated + stats.played + stats.playing + stats.toPlay + stats.abandoned

  return (
    <div className="compare-block">
      <h3 className="compare-block-name">{label}</h3>
      <p className="compare-block-summary">
        {tracked} / {total} games tracked
        {total > 0 && <span className="compare-pct"> ({Math.round((tracked / total) * 100)}%)</span>}
      </p>

      <div className="compare-bar">
        {STATUS_COMPARE.map(s => (
          <div
            key={s.key}
            className="compare-bar-seg"
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>

      <div className="compare-legend">
        {STATUS_COMPARE.map(s => (
          <span key={s.key} className="compare-legend-item">
            <span className="compare-dot" style={{ background: s.color }} />
            {s.label}: {s.value}
          </span>
        ))}
      </div>
    </div>
  )
}

function TrackersSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ height: 12, borderRadius: 6, marginBottom: 16 }} />
      <div className="tracker-filter-pills" style={{ marginBottom: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 36, width: 110, borderRadius: 999 }} />
        ))}
      </div>
      <GamesSkeleton />
    </div>
  )
}

function GamesSkeleton() {
  return (
    <div className="tracker-games-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i}>
          <div className="skeleton" style={{ aspectRatio: '3/4', borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 12, marginTop: 6, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}
