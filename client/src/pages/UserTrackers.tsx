import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import './UserTrackers.css'

interface TrackFilterDto {
  trackStatus: number
  trackStatusCount: number
}

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'None', color: '#4b5563' },
  1: { label: 'To Play', color: '#7c3aed' },
  2: { label: 'Playing', color: '#06b6d4' },
  3: { label: 'Beaten', color: '#10b981' },
  4: { label: 'Abandoned', color: '#ef4444' },
  5: { label: 'Played', color: '#f59e0b' },
}

export default function UserTrackers() {
  const { nickname } = useParams<{ nickname: string }>()
  const [stats, setStats] = useState<TrackFilterDto[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!nickname) return
    api.get<TrackFilterDto[]>(`/api/users/${encodeURIComponent(nickname)}/tracker-stats`)
      .then(res => { setStats(res); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [nickname])

  const total = stats.reduce((sum, s) => sum + s.trackStatusCount, 0)

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
          <h1 className="page-title">Trackers — {nickname}</h1>
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
            <div className="tracker-progress-bar">
              {stats.filter(s => s.trackStatus !== 0).map(s => {
                const info = STATUS_LABELS[s.trackStatus]
                return (
                  <div
                    key={s.trackStatus}
                    className="tracker-progress-segment"
                    style={{ width: `${(s.trackStatusCount / total) * 100}%`, background: info.color }}
                    title={`${info.label}: ${s.trackStatusCount}`}
                  />
                )
              })}
            </div>

            <div className="tracker-stats-grid">
              {stats.filter(s => s.trackStatus !== 0).map(s => {
                const info = STATUS_LABELS[s.trackStatus]
                return (
                  <div key={s.trackStatus} className="tracker-stat-card" style={{ borderColor: `${info.color}33` }}>
                    <div className="tracker-stat-dot" style={{ background: info.color }} />
                    <div>
                      <span className="tracker-stat-count" style={{ color: info.color }}>
                        {s.trackStatusCount}
                      </span>
                      <span className="tracker-stat-label">{info.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TrackersSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ height: 16, borderRadius: 8, marginBottom: 2 }} />
      <div className="tracker-stats-grid" style={{ marginTop: '1.5rem' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: 8 }} />
        ))}
      </div>
    </div>
  )
}
