import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getDashboard, type UserDashboardDto } from '../api/users'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const [dashboard, setDashboard] = useState<UserDashboardDto | null>(null)
  const [error, setError] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    setPageLoading(true)
    setError(false)
    getDashboard()
      .then(setDashboard)
      .catch(() => setError(true))
      .finally(() => setPageLoading(false))
  }, [user])

  if (!loading && !user) {
    return <Navigate to="/login" replace />
  }

  if (pageLoading || loading) {
    return (
      <div className="dashboard-page">
        <div className="container dashboard-grid">
          <div className="skeleton" style={{ height: 240, borderRadius: 28 }} />
          <div className="skeleton" style={{ height: 240, borderRadius: 28 }} />
          <div className="skeleton" style={{ height: 220, borderRadius: 24 }} />
          <div className="skeleton" style={{ height: 220, borderRadius: 24 }} />
        </div>
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="dashboard-page">
        <div className="container dashboard-empty">
          <h1>Could not load your dashboard</h1>
          <p>Try refreshing the page in a moment.</p>
        </div>
      </div>
    )
  }

  const { profile, stats, checklist, actions, recentActivity } = dashboard
  const completedSteps = checklist.filter(item => item.completed).length

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="container dashboard-hero-grid">
          <div className="dashboard-hero-copy">
            <span className="dashboard-kicker">Personal Dashboard</span>
            <h1>Welcome back, {profile.fullName}.</h1>
            <p className="dashboard-lead">
              This is your command center for profile setup, lists, trackers, badges, and everything that still needs your attention.
            </p>

            <div className="dashboard-progress-card">
              <div>
                <span className="dashboard-progress-label">Setup progress</span>
                <strong>{completedSteps}/{checklist.length} completed</strong>
              </div>
              <div className="dashboard-progress-bar">
                <span style={{ width: `${(completedSteps / checklist.length) * 100}%` }} />
              </div>
            </div>

            <div className="dashboard-hero-actions">
              {actions.map(action => (
                <Link key={action.href} to={action.href} className={`dashboard-action dashboard-action-${action.tone}`}>
                  <span className="dashboard-action-title">{action.title}</span>
                  <span className="dashboard-action-text">{action.description}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="dashboard-focus-card">
            <span className="dashboard-section-kicker">Right now</span>
            <h2>Your account at a glance</h2>
            <div className="dashboard-focus-list">
              <div className="dashboard-focus-item">
                <span>Unread notifications</span>
                <strong>{profile.unreadNotifications}</strong>
              </div>
              <div className="dashboard-focus-item">
                <span>Friends</span>
                <strong>{profile.friendsCount}</strong>
              </div>
              <div className="dashboard-focus-item">
                <span>Pending friend requests</span>
                <strong>{profile.pendingFriendRequests}</strong>
              </div>
              <div className="dashboard-focus-item">
                <span>Needs nickname</span>
                <strong>{profile.needsNickname ? 'Yes' : 'No'}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container dashboard-grid">
        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-section-kicker">Checklist</span>
              <h2>What to do next</h2>
            </div>
          </div>
          <div className="dashboard-checklist">
            {checklist.map(item => (
              <Link key={item.key} to={item.href} className={`dashboard-checklist-item ${item.completed ? 'is-complete' : ''}`}>
                <span className="dashboard-check-icon">{item.completed ? '✓' : '•'}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-section-kicker">Stats</span>
              <h2>Your momentum</h2>
            </div>
          </div>
          <div className="dashboard-stats-grid">
            {stats.map(stat => (
              <Link key={stat.label} to={stat.href} className="dashboard-stat-card">
                <span className="dashboard-stat-label">{stat.label}</span>
                <strong className="dashboard-stat-value">{stat.value}</strong>
                <p>{stat.hint}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="dashboard-card dashboard-card-wide">
          <div className="dashboard-card-header">
            <div>
              <span className="dashboard-section-kicker">Recent Activity</span>
              <h2>Your latest actions</h2>
            </div>
          </div>
          {recentActivity.length === 0 ? (
            <div className="dashboard-empty-inline">
              <p>You have not created lists or trackers yet. Start with the checklist above.</p>
            </div>
          ) : (
            <div className="dashboard-activity-list">
              {recentActivity.map((item, index) => (
                <Link key={`${item.type}-${index}-${item.date}`} to={item.href} className="dashboard-activity-item">
                  <span className={`dashboard-activity-pill dashboard-activity-pill-${item.type}`}>{item.type}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                  <time>{formatRelativeDate(item.date)}</time>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function formatRelativeDate(input: string): string {
  const date = new Date(input)
  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.max(0, Math.floor(diffMs / 3600000))

  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
