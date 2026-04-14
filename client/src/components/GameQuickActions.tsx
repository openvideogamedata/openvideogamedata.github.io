import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { login } from '../api/auth'
import { updateTracker, removeTrackerStatus } from '../api/games'
import type { UpdateTrackerRequest } from '../api/games'
import { useAuth } from '../context/AuthContext'
import type { Tracker } from '../types'
import { TrackStatus } from '../types'
import './GameQuickActions.css'

const STATUS_BUTTONS = [
  { status: TrackStatus.ToPlay, label: 'To Play', color: '#7c3aed' },
  { status: TrackStatus.Playing, label: 'Playing', color: '#06b6d4' },
  { status: TrackStatus.Played, label: 'Played', color: '#f59e0b' },
  { status: TrackStatus.Beaten, label: 'Beaten', color: '#10b981' },
  { status: TrackStatus.Abandoned, label: 'Abandoned', color: '#ef4444' },
]

type QuickTracker = Pick<Tracker, 'status' | 'statusDate' | 'note' | 'platinum'>

interface Props {
  game: {
    id: number
    title: string
    releaseYear?: number | null
    coverImageUrl: string | null
    coverBigImageUrl?: string | null
    score?: number | null
    tracker?: QuickTracker | null
  }
}

export default function GameQuickActions({ game }: Props) {
  const { user, loading: authLoading } = useAuth()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [tracker, setTracker] = useState<QuickTracker | null>(game.tracker ?? null)
  const [noteValue, setNoteValue] = useState(game.tracker?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    setTracker(game.tracker ?? null)
    setNoteValue(game.tracker?.note ?? '')
  }, [game.id, game.tracker])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return

      if (window.innerWidth <= 720) {
        setPanelStyle({})
        return
      }

      const rect = trigger.getBoundingClientRect()
      const panelWidth = Math.min(420, Math.max(360, window.innerWidth - 32))
      const gap = 14
      const spaceOnRight = window.innerWidth - rect.right - 16
      const placeRight = spaceOnRight >= panelWidth || rect.left < panelWidth
      const left = placeRight
        ? Math.min(rect.right + gap, window.innerWidth - panelWidth - 16)
        : Math.max(16, rect.left - panelWidth - gap)
      const top = Math.min(
        Math.max(16, rect.top),
        Math.max(16, window.innerHeight - 620)
      )

      setPanelStyle({
        width: `${panelWidth}px`,
        minWidth: `${panelWidth}px`,
        maxWidth: `${panelWidth}px`,
        top: `${top}px`,
        left: `${left}px`,
      })
    }

    updatePosition()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  const isTracked = tracker !== null && tracker.status !== TrackStatus.None

  async function persistTracker(request: UpdateTrackerRequest) {
    setSaving(true)
    try {
      const updated = await updateTracker(game.id, request)
      setTracker(updated)
      setNoteValue(updated.note ?? '')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusClick(status: TrackStatus) {
    if (!user) {
      login()
      return
    }

    setSaving(true)
    try {
      if (tracker?.status === status) {
        const updated = await removeTrackerStatus(game.id)
        setTracker(updated)
        setNoteValue(updated.note ?? '')
      } else {
        await persistTracker({
          status,
          note: noteValue || null,
          platinum: tracker?.platinum ?? false,
          statusDate: tracker?.statusDate ?? null,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDateChange(dateStr: string) {
    if (!tracker) return
    await persistTracker({
      status: tracker.status,
      note: noteValue || null,
      platinum: tracker.platinum,
      statusDate: dateStr ? new Date(dateStr).toISOString() : null,
    })
  }

  async function handleAddDate() {
    if (!tracker) return
    await persistTracker({
      status: tracker.status,
      note: noteValue || null,
      platinum: tracker.platinum,
      statusDate: new Date().toISOString(),
    })
  }

  async function handleRemoveDate() {
    if (!tracker) return
    await persistTracker({
      status: tracker.status,
      note: noteValue || null,
      platinum: tracker.platinum,
      statusDate: null,
    })
  }

  async function handlePlatinumToggle() {
    if (!tracker) return
    await persistTracker({
      status: tracker.status,
      note: noteValue || null,
      platinum: !tracker.platinum,
      statusDate: tracker.statusDate,
    })
  }

  async function handleNoteBlur() {
    if (!tracker || tracker.status === TrackStatus.None) return
    await persistTracker({
      status: tracker.status,
      note: noteValue || null,
      platinum: tracker.platinum,
      statusDate: tracker.statusDate,
    })
  }

  return (
    <>
      <button
        type="button"
        className="game-quick-trigger"
        ref={triggerRef}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Quick actions for ${game.title}`}
      >
        <div className="game-card-cover">
          <img
            src={game.coverBigImageUrl || game.coverImageUrl || ''}
            alt={game.title}
            loading="lazy"
            onError={e => {
              ;(e.target as HTMLImageElement).src =
                `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%231e1e38'/%3E%3Ctext x='100' y='150' text-anchor='middle' fill='%23475569' font-size='14' font-family='sans-serif'%3ENo cover%3C/text%3E%3C/svg%3E`
            }}
          />
          {(game.score ?? 0) > 0 && (
            <div className={`game-score ${scoreClass(game.score ?? 0)}`}>
              {game.score}
            </div>
          )}
        </div>
      </button>

      {open && (
        <div className="game-quick-overlay" onClick={() => setOpen(false)}>
          <div
            className="game-quick-panel"
            style={panelStyle}
            role="dialog"
            aria-modal="true"
            aria-label={`${game.title} quick actions`}
            onClick={event => event.stopPropagation()}
          >
            <div className="game-quick-handle" />
            <div className="game-quick-header">
              <div className="game-quick-cover-mini">
                <img
                  src={game.coverImageUrl || game.coverBigImageUrl || ''}
                  alt={game.title}
                  loading="lazy"
                />
              </div>
              <div className="game-quick-title-wrap">
                <h3 className="game-quick-title">{game.title}</h3>
                <p className="game-quick-meta">
                  {game.releaseYear != null && <span>{game.releaseYear}</span>}
                  {isTracked && <span>{formatTrackStatus(tracker!.status)}</span>}
                </p>
              </div>
              <button
                type="button"
                className="game-quick-close"
                onClick={() => setOpen(false)}
                aria-label="Close quick actions"
              >
                ×
              </button>
            </div>

            <div className="game-quick-section">
              <div className="game-quick-status-grid">
                {STATUS_BUTTONS.map(button => {
                  const active = tracker?.status === button.status
                  return (
                    <button
                      key={button.status}
                      type="button"
                      className={`game-quick-status-btn ${active ? 'active' : ''}`}
                      style={active ? { background: button.color, borderColor: button.color } : { borderColor: `${button.color}66` }}
                      onClick={() => handleStatusClick(button.status)}
                      disabled={authLoading || saving}
                    >
                      {button.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {authLoading ? (
              <p className="game-quick-empty">Loading your tracker...</p>
            ) : !user ? (
              <div className="game-quick-empty-block">
                <p className="game-quick-empty">Sign in to update your tracker without leaving this page.</p>
                <button type="button" className="game-quick-primary-btn" onClick={() => login()}>
                  Sign in with Google
                </button>
              </div>
            ) : isTracked ? (
              <>
                <div className="game-quick-section">
                  <div className="game-quick-date-row">
                    <span className="game-quick-label">Date</span>
                    {hasDate(tracker!) ? (
                      <div className="game-quick-date-controls">
                        <input
                          type="date"
                          className="game-quick-date-input"
                          value={tracker!.statusDate.slice(0, 10)}
                          onChange={event => handleDateChange(event.target.value)}
                          disabled={saving}
                        />
                        <button type="button" className="game-quick-inline-btn" onClick={handleRemoveDate} disabled={saving}>
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="game-quick-inline-btn" onClick={handleAddDate} disabled={saving}>
                        Add date
                      </button>
                    )}
                  </div>

                  {tracker!.status === TrackStatus.Beaten && (
                    <div className="game-quick-date-row">
                      <span className="game-quick-label">Completion</span>
                      <button
                        type="button"
                        className={`game-quick-inline-btn ${tracker!.platinum ? 'active' : ''}`}
                        onClick={handlePlatinumToggle}
                        disabled={saving}
                      >
                        {tracker!.platinum ? '100% complete' : 'Mark as 100%'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="game-quick-section">
                  <label className="game-quick-label" htmlFor={`game-quick-note-${game.id}`}>
                    Note
                  </label>
                  <textarea
                    id={`game-quick-note-${game.id}`}
                    className="game-quick-note"
                    rows={3}
                    maxLength={80}
                    placeholder="Add a quick note..."
                    value={noteValue}
                    onChange={event => setNoteValue(event.target.value)}
                    onBlur={handleNoteBlur}
                    disabled={saving}
                  />
                </div>
              </>
            ) : (
              <p className="game-quick-empty">Pick a status above to start tracking this game.</p>
            )}

            <div className="game-quick-footer">
              <Link to={`/games/${game.id}`} className="game-quick-link-btn" onClick={() => setOpen(false)}>
                Go to game page
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function hasDate(tracker: QuickTracker | Tracker): boolean {
  if (!tracker.statusDate) return false
  const date = new Date(tracker.statusDate)
  return date.getFullYear() > 1
}

function formatTrackStatus(status: TrackStatus): string {
  switch (status) {
    case TrackStatus.ToPlay:
      return 'To Play'
    case TrackStatus.Playing:
      return 'Playing'
    case TrackStatus.Beaten:
      return 'Beaten'
    case TrackStatus.Abandoned:
      return 'Abandoned'
    case TrackStatus.Played:
      return 'Played'
    default:
      return 'Not tracked'
  }
}

function scoreClass(score: number): string {
  if (score >= 85) return 'score-great'
  if (score >= 70) return 'score-good'
  if (score >= 50) return 'score-ok'
  return 'score-low'
}
