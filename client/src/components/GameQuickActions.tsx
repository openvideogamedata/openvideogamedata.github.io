import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { login } from '../api/auth'
import { removeTrackerStatus, updateTracker } from '../api/games'
import type { UpdateTrackerRequest } from '../api/games'
import { useAuth } from '../context/AuthContext'
import type { Tracker } from '../types'
import { TrackStatus } from '../types'
import './GameQuickActions.css'

const DESKTOP_BREAKPOINT = 720
const DESKTOP_MIN_WIDTH = 380
const DESKTOP_MAX_WIDTH = 440
const PANEL_GAP = 14
const PANEL_VIEWPORT_MARGIN = 16

const STATUS_OPTIONS = [
  { status: TrackStatus.ToPlay, label: 'To Play', color: '#7c3aed' },
  { status: TrackStatus.Playing, label: 'Playing', color: '#06b6d4' },
  { status: TrackStatus.Played, label: 'Played', color: '#f59e0b' },
  { status: TrackStatus.Beaten, label: 'Beaten', color: '#10b981' },
  { status: TrackStatus.Abandoned, label: 'Abandoned', color: '#ef4444' },
] as const

type QuickTracker = Pick<Tracker, 'status' | 'statusDate' | 'note' | 'platinum'>
type Appearance = 'card' | 'fill'

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
  appearance?: Appearance
}

export default function GameQuickActions({ game, appearance = 'card' }: Props) {
  const { user, loading: authLoading } = useAuth()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const [open, setOpen] = useState(false)
  const [tracker, setTracker] = useState<QuickTracker | null>(game.tracker ?? null)
  const [noteValue, setNoteValue] = useState(game.tracker?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [desktopPanelStyle, setDesktopPanelStyle] = useState<React.CSSProperties>({})

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

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useLayoutEffect(() => {
    if (!open) return

    const updateDesktopPosition = () => {
      if (window.innerWidth <= DESKTOP_BREAKPOINT) {
        setDesktopPanelStyle({})
        return
      }

      const trigger = triggerRef.current
      const panel = panelRef.current
      if (!trigger || !panel) return

      const rect = trigger.getBoundingClientRect()
      const panelWidth = Math.min(
        DESKTOP_MAX_WIDTH,
        Math.max(DESKTOP_MIN_WIDTH, window.innerWidth - PANEL_VIEWPORT_MARGIN * 2)
      )
      const panelHeight = panel.offsetHeight || 520

      const spaceOnRight = window.innerWidth - rect.right - PANEL_VIEWPORT_MARGIN
      const shouldOpenRight = spaceOnRight >= panelWidth || rect.left < panelWidth
      const unconstrainedLeft = shouldOpenRight
        ? rect.right + PANEL_GAP
        : rect.left - panelWidth - PANEL_GAP

      setDesktopPanelStyle({
        width: `${panelWidth}px`,
        minWidth: `${panelWidth}px`,
        maxWidth: `${panelWidth}px`,
        left: `${clamp(unconstrainedLeft, PANEL_VIEWPORT_MARGIN, window.innerWidth - panelWidth - PANEL_VIEWPORT_MARGIN)}px`,
        top: `${clamp(rect.top, PANEL_VIEWPORT_MARGIN, window.innerHeight - panelHeight - PANEL_VIEWPORT_MARGIN)}px`,
      })
    }

    const frame = window.requestAnimationFrame(updateDesktopPosition)
    window.addEventListener('resize', updateDesktopPosition)
    window.addEventListener('scroll', updateDesktopPosition, true)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateDesktopPosition)
      window.removeEventListener('scroll', updateDesktopPosition, true)
    }
  }, [open, tracker, noteValue, authLoading, saving])

  const isTracked = tracker !== null && tracker.status !== TrackStatus.None

  async function runTrackerMutation(task: () => Promise<Tracker>) {
    setSaving(true)
    try {
      const next = toQuickTracker(await task())
      setTracker(next)
      setNoteValue(next?.note ?? '')
    } finally {
      setSaving(false)
    }
  }

  async function saveTracker(request: UpdateTrackerRequest) {
    await runTrackerMutation(() => updateTracker(game.id, request))
  }

  async function handleStatusChange(status: TrackStatus) {
    if (!user) {
      login(window.location.href)
      return
    }

    if (tracker?.status === status) {
      await runTrackerMutation(() => removeTrackerStatus(game.id))
      return
    }

    await saveTracker({
      status,
      note: noteValue || null,
      platinum: tracker?.platinum ?? false,
      statusDate: tracker?.statusDate ?? null,
    })
  }

  async function handleDateChange(dateValue: string) {
    if (!tracker) return

    await saveTracker({
      status: tracker.status,
      note: noteValue || null,
      platinum: tracker.platinum,
      statusDate: dateValue ? new Date(dateValue).toISOString() : null,
    })
  }

  async function handleAddDate() {
    if (!tracker) return

    await saveTracker({
      status: tracker.status,
      note: noteValue || null,
      platinum: tracker.platinum,
      statusDate: new Date().toISOString(),
    })
  }

  async function handleRemoveDate() {
    if (!tracker) return

    await saveTracker({
      status: tracker.status,
      note: noteValue || null,
      platinum: tracker.platinum,
      statusDate: null,
    })
  }

  async function handlePlatinumToggle() {
    if (!tracker) return

    await saveTracker({
      status: tracker.status,
      note: noteValue || null,
      platinum: !tracker.platinum,
      statusDate: tracker.statusDate,
    })
  }

  async function handleNoteBlur() {
    if (!tracker || tracker.status === TrackStatus.None) return

    await saveTracker({
      status: tracker.status,
      note: noteValue || null,
      platinum: tracker.platinum,
      statusDate: tracker.statusDate,
    })
  }

  return (
    <>
      <div className="game-quick-root" data-appearance={appearance}>
        <button
          ref={triggerRef}
          type="button"
          className="game-quick-trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Open quick tracker menu for ${game.title}`}
          onClick={() => setOpen(true)}
        >
          <div className="game-quick-media-shell">
            <img
              src={game.coverBigImageUrl || game.coverImageUrl || fallbackCoverDataUrl()}
              alt={game.title}
              className="game-quick-media"
              loading="lazy"
              onError={event => {
                ;(event.target as HTMLImageElement).src = fallbackCoverDataUrl()
              }}
            />
            {(game.score ?? 0) > 0 && (
              <div className={`game-score ${scoreClass(game.score ?? 0)}`}>
                {game.score}
              </div>
            )}
          </div>
        </button>
      </div>

      {open && (
        <div className="game-quick-overlay" onClick={() => setOpen(false)}>
          <div
            ref={panelRef}
            className="game-quick-panel"
            style={desktopPanelStyle}
            role="dialog"
            aria-modal="true"
            aria-label={`${game.title} quick tracker menu`}
            onClick={event => event.stopPropagation()}
          >
            <div className="game-quick-sheet-handle" />

            <header className="game-quick-header">
              <div className="game-quick-header-copy">
                <p className="game-quick-eyebrow">Quick tracker</p>
                <h3 className="game-quick-title">{game.title}</h3>
                <div className="game-quick-meta">
                  {game.releaseYear != null && <span>{game.releaseYear}</span>}
                  {isTracked && <span>{formatTrackStatus(tracker!.status)}</span>}
                  {isTracked && hasDate(tracker!) && (
                    <span>{formatCompactDate(tracker!.statusDate)}</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="game-quick-close"
                onClick={() => setOpen(false)}
                aria-label="Close quick tracker menu"
              >
                x
              </button>
            </header>

            <section className="game-quick-section">
              <div className="game-quick-status-grid">
                {STATUS_OPTIONS.map(option => {
                  const active = tracker?.status === option.status

                  return (
                    <button
                      key={option.status}
                      type="button"
                      className={`game-quick-status-btn ${active ? 'active' : ''}`}
                      style={active ? { background: option.color, borderColor: option.color } : { borderColor: `${option.color}55` }}
                      onClick={() => handleStatusChange(option.status)}
                      disabled={authLoading || saving}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </section>

            {authLoading ? (
              <section className="game-quick-section">
                <p className="game-quick-hint">Loading your tracker...</p>
              </section>
            ) : !user ? (
              <section className="game-quick-section">
                <p className="game-quick-hint">
                  Sign in to update status, date and notes without leaving this list.
                </p>
                <button
                  type="button"
                  className="game-quick-primary-btn"
                  onClick={() => login(window.location.href)}
                >
                  Sign in with Google
                </button>
              </section>
            ) : isTracked ? (
              <>
                <section className="game-quick-section">
                  <div className="game-quick-row">
                    <div>
                      <p className="game-quick-row-label">Date</p>
                      <p className="game-quick-row-value">
                        {hasDate(tracker!) ? formatLongDate(tracker!.statusDate) : 'No date set'}
                      </p>
                    </div>

                    {hasDate(tracker!) ? (
                      <div className="game-quick-date-controls">
                        <input
                          type="date"
                          className="game-quick-date-input"
                          value={tracker!.statusDate.slice(0, 10)}
                          onChange={event => handleDateChange(event.target.value)}
                          disabled={saving}
                        />
                        <button
                          type="button"
                          className="game-quick-secondary-btn"
                          onClick={handleRemoveDate}
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="game-quick-secondary-btn"
                        onClick={handleAddDate}
                        disabled={saving}
                      >
                        Add date
                      </button>
                    )}
                  </div>

                  {tracker!.status === TrackStatus.Beaten && (
                    <div className="game-quick-row game-quick-row-stack">
                      <div>
                        <p className="game-quick-row-label">Completion</p>
                        <p className="game-quick-row-value">
                          {tracker!.platinum ? '100% complete' : 'Standard completion'}
                        </p>
                      </div>

                      <button
                        type="button"
                        className={`game-quick-secondary-btn ${tracker!.platinum ? 'active' : ''}`}
                        onClick={handlePlatinumToggle}
                        disabled={saving}
                      >
                        {tracker!.platinum ? 'Remove 100%' : 'Mark as 100%'}
                      </button>
                    </div>
                  )}
                </section>

                <section className="game-quick-section">
                  <label className="game-quick-field-label" htmlFor={`game-quick-note-${game.id}`}>
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
                </section>
              </>
            ) : (
              <section className="game-quick-section">
                <p className="game-quick-hint">
                  Pick a status above to start tracking this game right away.
                </p>
              </section>
            )}

            <footer className="game-quick-footer">
              <Link
                to={`/games/${game.id}`}
                className="game-quick-link-btn"
                onClick={() => setOpen(false)}
              >
                Go to game page
              </Link>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}

function toQuickTracker(tracker: Tracker | null): QuickTracker | null {
  if (!tracker) return null

  return {
    status: tracker.status,
    statusDate: tracker.statusDate,
    note: tracker.note,
    platinum: tracker.platinum,
  }
}

function hasDate(tracker: QuickTracker): boolean {
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

function formatCompactDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatLongDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function scoreClass(score: number): string {
  if (score >= 85) return 'score-great'
  if (score >= 70) return 'score-good'
  if (score >= 50) return 'score-ok'
  return 'score-low'
}

function fallbackCoverDataUrl(): string {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%231e1e38'/%3E%3Ctext x='100' y='150' text-anchor='middle' fill='%23475569' font-size='14' font-family='sans-serif'%3ENo cover%3C/text%3E%3C/svg%3E"
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
