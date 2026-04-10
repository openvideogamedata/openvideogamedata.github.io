import { useState, useEffect } from 'react'
import { getNotifications } from '../api/notifications'
import type { NotificationDto } from '../api/notifications'
import { timeAgo } from '../utils/time'
import './Notifications.css'

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getNotifications(true) // marks as read on open
      .then(res => { setNotifications(res); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  if (error) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>Sign in to view notifications</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>This page requires authentication.</p>
      </div>
    )
  }

  return (
    <div className="notifications-page">
      <section className="notifications-header">
        <div className="container">
          <h1 className="page-title">Notifications</h1>
          {!loading && (
            <p className="page-subtitle">
              {notifications.length === 0 ? 'All caught up!' : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      </section>

      <div className="container notifications-body">
        {loading ? (
          <NotificationsSkeleton />
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <span className="empty-icon">🔔</span>
            <p>No notifications yet.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map(n => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NotificationItem({ notification }: { notification: NotificationDto }) {
  return (
    <div className={`notification-item ${notification.read ? 'read' : 'unread'}`}>
      <div className="notification-dot" />
      <div className="notification-body">
        <p className="notification-message">{notification.message}</p>
        <span className="notification-time">{timeAgo(notification.dateAdded)}</span>
      </div>
    </div>
  )
}

function NotificationsSkeleton() {
  return (
    <div className="notifications-list">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="notification-item read">
          <div className="notification-dot" style={{ background: 'var(--surface-3)' }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 6, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 11, width: 80, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
