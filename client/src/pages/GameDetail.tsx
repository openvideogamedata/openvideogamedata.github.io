import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Paginator from '../components/Paginator'
import PixelArt from '../components/PixelArt'
import { getGame, getCitations, updateTracker, removeTrackerStatus } from '../api/games'
import type { UpdateTrackerRequest } from '../api/games'
import { useAuth } from '../context/AuthContext'
import type { GameDetailResponse, CitationsResponse, Tracker, Pager } from '../types'
import { TrackStatus } from '../types'
import { generateDefaultPixelArt } from '../utils/pixelArt'
import './GameDetail.css'

const STATUS_BUTTONS = [
  { status: TrackStatus.ToPlay,    label: 'To Play',   color: '#7c3aed' },
  { status: TrackStatus.Playing,   label: 'Playing',   color: '#06b6d4' },
  { status: TrackStatus.Played,    label: 'Played',    color: '#f59e0b' },
  { status: TrackStatus.Beaten,    label: 'Beaten',    color: '#10b981' },
  { status: TrackStatus.Abandoned, label: 'Abandoned', color: '#ef4444' },
]

function hasDate(tracker: Tracker): boolean {
  if (!tracker.statusDate) return false
  const d = new Date(tracker.statusDate)
  return d.getFullYear() > 1
}

export default function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<GameDetailResponse | null>(null)
  const [citations, setCitations] = useState<CitationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [citLoading, setCitLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Tracker state
  const [tracker, setTracker] = useState<Tracker | null>(null)
  const [trackerLoading, setTrackerLoading] = useState(false)
  const [noteValue, setNoteValue] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getGame(Number(id))
      .then(res => {
        setData(res)
        setTracker(res.tracker)
        setNoteValue(res.tracker?.note ?? '')
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })

    getCitations(Number(id))
      .then(setCitations)
  }, [id])

  function loadCitationsPage(page: number) {
    if (!id) return
    setCitLoading(true)
    getCitations(Number(id), page)
      .then(res => { setCitations(res); setCitLoading(false) })
      .catch(() => setCitLoading(false))
  }

  async function handleStatusClick(status: TrackStatus) {
    if (!id) return
    setTrackerLoading(true)
    try {
      if (tracker?.status === status) {
        // Toggle off — remove
        const updated = await removeTrackerStatus(Number(id))
        setTracker(updated)
        setNoteValue(updated.note ?? '')
      } else {
        const req: UpdateTrackerRequest = {
          status,
          note: noteValue || null,
          platinum: tracker?.platinum ?? false,
          statusDate: tracker?.statusDate ?? null,
        }
        const updated = await updateTracker(Number(id), req)
        setTracker(updated)
        setNoteValue(updated.note ?? '')
      }
    } catch { /* silent */ }
    setTrackerLoading(false)
  }

  async function handleNoteBlur() {
    if (!id || !tracker || tracker.status === TrackStatus.None) return
    setTrackerLoading(true)
    try {
      const updated = await updateTracker(Number(id), {
        status: tracker.status,
        note: noteValue || null,
        platinum: tracker.platinum,
        statusDate: tracker.statusDate,
      })
      setTracker(updated)
    } catch { /* silent */ }
    setTrackerLoading(false)
  }

  async function handlePlatinumToggle() {
    if (!id || !tracker) return
    setTrackerLoading(true)
    try {
      const updated = await updateTracker(Number(id), {
        status: tracker.status,
        note: noteValue || null,
        platinum: !tracker.platinum,
        statusDate: tracker.statusDate,
      })
      setTracker(updated)
    } catch { /* silent */ }
    setTrackerLoading(false)
  }

  async function handleAddDate() {
    if (!id || !tracker) return
    setTrackerLoading(true)
    try {
      const updated = await updateTracker(Number(id), {
        status: tracker.status,
        note: noteValue || null,
        platinum: tracker.platinum,
        statusDate: new Date().toISOString(),
      })
      setTracker(updated)
    } catch { /* silent */ }
    setTrackerLoading(false)
  }

  async function handleRemoveDate() {
    if (!id || !tracker) return
    setTrackerLoading(true)
    try {
      const updated = await updateTracker(Number(id), {
        status: tracker.status,
        note: noteValue || null,
        platinum: tracker.platinum,
        statusDate: null,
      })
      setTracker(updated)
    } catch { /* silent */ }
    setTrackerLoading(false)
  }

  async function handleDateChange(dateStr: string) {
    if (!id || !tracker) return
    setTrackerLoading(true)
    try {
      const updated = await updateTracker(Number(id), {
        status: tracker.status,
        note: noteValue || null,
        platinum: tracker.platinum,
        statusDate: dateStr ? new Date(dateStr).toISOString() : null,
      })
      setTracker(updated)
    } catch { /* silent */ }
    setTrackerLoading(false)
  }

  if (loading) return <GameDetailSkeleton />
  if (notFound || !data) return (
    <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>Game not found.</p>
      <Link to="/games" style={{ color: 'var(--purple-light)', marginTop: 12, display: 'inline-block' }}>← Back to games</Link>
    </div>
  )

  const { game, citationsSummary, friendsTrackers } = data
  const score = game.score
  const isTracked = tracker !== null && tracker.status !== TrackStatus.None

  return (
    <div className="game-detail-page">
      <div className="container">
        <div className="game-detail-layout">
          {/* Cover */}
          <aside className="game-detail-aside">
            <div className="game-cover-wrap">
              <img
                src={game.coverBigImageUrl || game.coverImageUrl}
                alt={game.title}
                className="game-cover-img"
                onError={e => { (e.target as HTMLImageElement).src = 'https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png' }}
              />
              {score > 0 && (
                <div className={`game-score-badge ${scoreClass(score)}`}>
                  <span className="score-value">{score}</span>
                  <span className="score-max">/100</span>
                </div>
              )}
            </div>
          </aside>

          {/* Main info */}
          <main className="game-detail-main">
            <p className="game-detail-year">{game.releaseYear}</p>
            <h1 className="game-detail-title">{game.title}</h1>

            {/* Citations summary */}
            {citationsSummary && citationsSummary.numberOfCategories > 0 && (
              <div className="citations-summary">
                <div className="citations-stat">
                  <span className="stat-value">{citationsSummary.numberOfCategories}</span>
                  <span className="stat-label">categories</span>
                </div>
                {citationsSummary.mostCitedCategory && (
                  <div className="citations-top">
                    Most cited in{' '}
                    <Link to={`/list/${citationsSummary.mostCitedCategoryUrl}`} className="citations-top-link">
                      "{citationsSummary.mostCitedCategory}"
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Tracker */}
            {authLoading ? (
              <div className="tracker-placeholder">
                <p className="tracker-placeholder-text">Loading tracker...</p>
              </div>
            ) : user ? (
              <div className={`tracker-section ${trackerLoading ? 'tracker-loading' : ''}`}>
                <div className="tracker-buttons">
                  {STATUS_BUTTONS.map(btn => {
                    const active = tracker?.status === btn.status
                    return (
                      <button
                        key={btn.status}
                        className={`tracker-btn ${active ? 'active' : ''}`}
                        style={active ? { background: btn.color, borderColor: btn.color } : { borderColor: `${btn.color}55` }}
                        onClick={() => handleStatusClick(btn.status)}
                        disabled={trackerLoading}
                        title={active ? `Remove "${btn.label}"` : `Mark as "${btn.label}"`}
                      >
                        {btn.label}
                      </button>
                    )
                  })}
                </div>

                {isTracked && (
                  <div className="tracker-extras">
                    <div className="tracker-summary">
                      <span className="tracker-summary-status">
                        {formatTrackStatus(tracker!.status)}
                      </span>
                      {hasDate(tracker!) && (
                        <span className="tracker-summary-date">
                          {formatTrackerDate(tracker!.statusDate)}
                        </span>
                      )}
                    </div>

                    {/* Date row */}
                    <div className="tracker-date-row">
                      {hasDate(tracker!) ? (
                        <>
                          <input
                            type="date"
                            className="tracker-date-input"
                            value={tracker!.statusDate.slice(0, 10)}
                            onChange={e => handleDateChange(e.target.value)}
                            disabled={trackerLoading}
                          />
                          <button className="tracker-icon-btn" onClick={handleRemoveDate} disabled={trackerLoading} title="Remove date">✕</button>
                        </>
                      ) : (
                        <button className="tracker-icon-btn" onClick={handleAddDate} disabled={trackerLoading} title="Add date">
                          + Date
                        </button>
                      )}
                      {tracker!.status === TrackStatus.Beaten && (
                        <button
                          className={`tracker-platinum-btn ${tracker!.platinum ? 'active' : ''}`}
                          onClick={handlePlatinumToggle}
                          disabled={trackerLoading}
                          title="100% / Platinum"
                        >
                          🏆 100%
                        </button>
                      )}
                    </div>

                    {/* Notes */}
                    <textarea
                      className="tracker-note"
                      maxLength={80}
                      rows={2}
                      placeholder="Add a note… (max 80 chars)"
                      value={noteValue}
                      onChange={e => setNoteValue(e.target.value)}
                      onBlur={handleNoteBlur}
                      disabled={trackerLoading}
                    />
                  </div>
                )}

                {/* Friends trackers */}
                {friendsTrackers.length > 0 && (
                  <div className="friends-trackers">
                    <h2 className="friends-trackers-title">Friends</h2>
                    {friendsTrackers
                      .filter(ft => ft.user)
                      .sort((a, b) => (b.tracker.note?.length ?? 0) - (a.tracker.note?.length ?? 0))
                      .slice(0, 5)
                      .map((ft, i) => ft.user && (
                        <div key={i} className="friend-tracker-row">
                          <Link to={`/users/${ft.user.nickname}/trackers`} className="friend-tracker-avatar">
                            <PixelArt
                              matrix={ft.user.userPicture ?? generateDefaultPixelArt(ft.user.fullName || ft.user.nickname)}
                              cellSize={3}
                            />
                          </Link>
                          <div className="friend-tracker-content">
                            <Link to={`/users/${ft.user.nickname}/trackers`} className="friend-tracker-name">
                              {ft.user.fullName}
                            </Link>
                            <span className="friend-tracker-meta">
                              {formatTrackStatus(ft.tracker.status)}
                              {hasDate(ft.tracker) ? ` on ${formatTrackerDate(ft.tracker.statusDate)}` : ''}
                            </span>
                            {ft.tracker.note && (
                              <p className="friend-tracker-note">{ft.tracker.note}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="tracker-placeholder">
                <p className="tracker-placeholder-text">
                  <Link to="/login" className="tracker-login-link">Sign in</Link> to track this game
                </p>
              </div>
            )}
          </main>
        </div>

        {/* Citations list */}
        {citations && citations.citations.length > 0 && (
          <section className="citations-section">
            <h2 className="citations-title">
              Lists this game appears in
              <span className="citations-count">{citations.numberOfCategories} categories</span>
            </h2>
            <div className={`citations-list ${citLoading ? 'loading' : ''}`}>
              {citations.citations.map(c => (
                <div key={c.id} className="citation-row">
                  <span className="citation-position">#{c.position}</span>
                  <div className="citation-info">
                    {c.sourceName && c.sourceListUrl && (
                      <a href={c.sourceListUrl} target="_blank" rel="noopener noreferrer" className="citation-source">
                        {c.sourceName}
                      </a>
                    )}
                    {c.finalGameListName && c.finalGameListSlug && (
                      <Link to={`/list/${c.finalGameListSlug}`} className="citation-list">
                        {c.finalGameListName}
                      </Link>
                    )}
                  </div>
                  <span className="citation-score">{c.score} pts</span>
                </div>
              ))}
            </div>
            {citations.pager && (
              <Paginator
                pager={citations.pager as Pager}
                onPageChange={loadCitationsPage}
              />
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function scoreClass(score: number): string {
  if (score >= 85) return 'score-great'
  if (score >= 70) return 'score-good'
  if (score >= 50) return 'score-ok'
  return 'score-low'
}

function formatTrackStatus(status: TrackStatus): string {
  switch (status) {
    case TrackStatus.ToPlay: return 'To Play'
    case TrackStatus.Playing: return 'Playing'
    case TrackStatus.Beaten: return 'Beaten'
    case TrackStatus.Abandoned: return 'Abandoned'
    case TrackStatus.Played: return 'Played'
    default: return 'Not tracked'
  }
}

function formatTrackerDate(date: string): string {
  return new Date(date).toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function GameDetailSkeleton() {
  return (
    <div className="game-detail-page">
      <div className="container">
        <div className="game-detail-layout">
          <aside className="game-detail-aside">
            <div className="skeleton" style={{ width: 200, height: 280, borderRadius: 'var(--radius-lg)' }} />
          </aside>
          <main className="game-detail-main">
            <div className="skeleton" style={{ height: 16, width: 60, marginBottom: 12, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 36, width: 320, marginBottom: 20, borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 80, width: '100%', borderRadius: 'var(--radius)' }} />
          </main>
        </div>
      </div>
    </div>
  )
}
