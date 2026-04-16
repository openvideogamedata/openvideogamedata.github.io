import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import UserAvatar from '../components/UserAvatar'
import TabBar from '../components/TabBar'
import {
  getFriendsAndRequests,
  getFriendActivity,
  acceptRequest,
  declineRequest,
  removeFriend,
} from '../api/friends'
import type {
  FriendsResponse,
  FriendDto,
  FriendRequestDto,
  FriendActivityItemDto,
  TrackStatus,
} from '../api/friends'
import './Friends.css'

type Tab = 'friends' | 'activity'

const TABS = [
  { key: 'friends', label: 'Friends' },
  { key: 'activity', label: 'Activity' },
]

export default function Friends() {
  const [activeTab, setActiveTab] = useState<Tab>('friends')
  const [data, setData] = useState<FriendsResponse | null>(null)
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [activity, setActivity] = useState<FriendActivityItemDto[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityLoaded, setActivityLoaded] = useState(false)
  const [error, setError] = useState(false)

  function reloadFriends() {
    setFriendsLoading(true)
    getFriendsAndRequests()
      .then(res => { setData(res); setFriendsLoading(false) })
      .catch(() => { setError(true); setFriendsLoading(false) })
  }

  function loadActivity() {
    if (activityLoaded) return
    setActivityLoading(true)
    getFriendActivity()
      .then(res => { setActivity(res); setActivityLoading(false); setActivityLoaded(true) })
      .catch(() => { setActivityLoading(false); setActivityLoaded(true) })
  }

  useEffect(reloadFriends, [])

  function handleTabChange(key: string) {
    setActiveTab(key as Tab)
    if (key === 'activity') loadActivity()
  }

  async function handleAccept(friendshipId: number) {
    await acceptRequest(friendshipId)
    reloadFriends()
  }

  async function handleDecline(friendshipId: number) {
    await declineRequest(friendshipId)
    reloadFriends()
  }

  async function handleRemove(friendshipId: number) {
    await removeFriend(friendshipId)
    reloadFriends()
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>Sign in to view friends</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>This page requires authentication.</p>
      </div>
    )
  }

  const pendingCount = data?.receivedRequests.length ?? 0

  return (
    <div className="friends-page">
      <section className="friends-header">
        <div className="container">
          <h1 className="page-title">Friends</h1>
          {data && (
            <p className="page-subtitle">
              {data.friends.length} friend{data.friends.length !== 1 ? 's' : ''}
              {pendingCount > 0 && ` · ${pendingCount} pending request${pendingCount !== 1 ? 's' : ''}`}
            </p>
          )}
          <TabBar
            tabs={TABS}
            active={activeTab}
            onChange={handleTabChange}
          />
        </div>
      </section>

      <div className="container friends-body">
        {activeTab === 'friends' && (
          <>
            {friendsLoading ? (
              <FriendsSkeleton />
            ) : (
              <>
                {/* Received requests */}
                {data && data.receivedRequests.length > 0 && (
                  <section className="friends-section">
                    <h2 className="friends-section-title">Pending Requests</h2>
                    <div className="friends-list">
                      {data.receivedRequests.map(req => (
                        <RequestRow
                          key={req.friendshipId}
                          request={req}
                          onAccept={() => handleAccept(req.friendshipId)}
                          onDecline={() => handleDecline(req.friendshipId)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Friends */}
                <section className="friends-section">
                  <h2 className="friends-section-title">Friends</h2>
                  {data && data.friends.length === 0 ? (
                    <p className="empty-state">No friends yet. Find players to add on the <Link to="/users">users page</Link>.</p>
                  ) : (
                    <div className="friends-list">
                      {data?.friends.map(f => (
                        <FriendRow key={f.friendshipId} friend={f} onRemove={() => handleRemove(f.friendshipId)} />
                      ))}
                    </div>
                  )}
                </section>

                {/* Sent requests */}
                {data && data.sentRequests.length > 0 && (
                  <section className="friends-section">
                    <h2 className="friends-section-title">Sent Requests</h2>
                    <div className="friends-list">
                      {data.sentRequests.map(req => (
                        <SentRequestRow
                          key={req.friendshipId}
                          request={req}
                          onCancel={() => handleDecline(req.friendshipId)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'activity' && (
          <section className="friends-section">
            <h2 className="friends-section-title">Recent Activity</h2>
            <ActivityFeed items={activity} loading={activityLoading} />
          </section>
        )}
      </div>
    </div>
  )
}

// ─── Friends tab components ───────────────────────────────────────────────────

function FriendRow({ friend, onRemove }: { friend: FriendDto; onRemove: () => void }) {
  const { friend: u } = friend
  return (
    <div className="friend-row">
      <Link to={`/users/${u.nickname}`} className="friend-info">
        <div className="friend-avatar">
          <UserAvatar userPicture={u.userPicture} name={u.fullName || u.nickname} cellSize={6} />
        </div>
        <div>
          <span className="friend-name">{u.fullName}</span>
          <span className="friend-nick">@{u.nickname}</span>
        </div>
      </Link>
      <button className="btn-danger-sm" onClick={onRemove}>Remove</button>
    </div>
  )
}

function RequestRow({ request, onAccept, onDecline }: {
  request: FriendRequestDto
  onAccept: () => void
  onDecline: () => void
}) {
  const u = request.requester
  return (
    <div className="friend-row">
      <Link to={`/users/${u.nickname}`} className="friend-info">
        <div className="friend-avatar">
          <UserAvatar userPicture={u.userPicture} name={u.fullName || u.nickname} cellSize={6} />
        </div>
        <div>
          <span className="friend-name">{u.fullName}</span>
          <span className="friend-nick">@{u.nickname}</span>
        </div>
      </Link>
      <div className="request-actions">
        <button className="btn-primary-sm" onClick={onAccept}>Accept</button>
        <button className="btn-outline-sm" onClick={onDecline}>Decline</button>
      </div>
    </div>
  )
}

function SentRequestRow({ request, onCancel }: { request: FriendRequestDto; onCancel: () => void }) {
  const u = request.requester
  return (
    <div className="friend-row">
      <Link to={`/users/${u.nickname}`} className="friend-info">
        <div className="friend-avatar">
          <UserAvatar userPicture={u.userPicture} name={u.fullName || u.nickname} cellSize={6} />
        </div>
        <div>
          <span className="friend-name">{u.fullName}</span>
          <span className="friend-nick">@{u.nickname} · Pending</span>
        </div>
      </Link>
      <button className="btn-outline-sm" onClick={onCancel}>Cancel</button>
    </div>
  )
}

function FriendsSkeleton() {
  return (
    <div className="friends-list" style={{ marginTop: '1.5rem' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="friend-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 14, width: 140, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Activity tab components ──────────────────────────────────────────────────

const STATUS_LABELS: Record<TrackStatus, string> = {
  0: '',
  1: 'wants to play',
  2: 'is playing',
  3: 'beat',
  4: 'abandoned',
  5: 'played',
}

const STATUS_CLASS: Record<TrackStatus, string> = {
  0: '',
  1: 'toplay',
  2: 'playing',
  3: 'beaten',
  4: 'abandoned',
  5: 'played',
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(isoDate).toLocaleDateString()
}

function ActivityFeed({ items, loading }: { items: FriendActivityItemDto[]; loading: boolean }) {
  if (loading) return <ActivitySkeleton />
  if (items.length === 0) {
    return (
      <p className="empty-state">
        No recent activity from your friends yet.
      </p>
    )
  }

  return (
    <div className="activity-feed">
      {items.map(item => (
        <ActivityItem key={item.trackerId} item={item} />
      ))}
    </div>
  )
}

function ActivityItem({ item }: { item: FriendActivityItemDto }) {
  return (
    <div className="activity-item">
      <Link to={`/users/${item.user.nickname}`} className="activity-avatar">
        <UserAvatar userPicture={item.user.userPicture} name={item.user.fullName || item.user.nickname} cellSize={5} />
      </Link>

      <div className="activity-body">
        <div className="activity-line">
          <Link to={`/users/${item.user.nickname}`} className="activity-user">
            {item.user.fullName}
          </Link>
          <span className={`activity-status status-${STATUS_CLASS[item.status]}`}>
            {STATUS_LABELS[item.status]}
          </span>
          <Link to={`/games/${item.gameId}`} className="activity-game">
            {item.gameTitle}
          </Link>
          {item.platinum && <span className="activity-platinum">Platinum</span>}
        </div>
        {item.note && (
          <p className="activity-note">{item.note}</p>
        )}
        <span className="activity-time">{formatRelativeTime(item.lastUpdateDate)}</span>
      </div>

      <Link to={`/games/${item.gameId}`} className="activity-cover">
        <img src={item.coverImageUrl} alt={item.gameTitle} loading="lazy" />
      </Link>
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="activity-feed">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="activity-skeleton-item">
          <div className="skeleton" style={{ width: 26, height: 26, borderRadius: 5, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ height: 13, width: '60%', borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 11, width: '30%', borderRadius: 4 }} />
          </div>
          <div className="skeleton" style={{ width: 36, height: 48, borderRadius: 4, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}
