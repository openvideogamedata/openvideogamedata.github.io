import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PixelArt from '../components/PixelArt'
import { getFriendsAndRequests, acceptRequest, declineRequest, removeFriend } from '../api/friends'
import type { FriendsResponse, FriendDto, FriendRequestDto } from '../api/friends'
import './Friends.css'

export default function Friends() {
  const [data, setData] = useState<FriendsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function reload() {
    setLoading(true)
    getFriendsAndRequests()
      .then(res => { setData(res); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }

  useEffect(reload, [])

  async function handleAccept(friendshipId: number) {
    await acceptRequest(friendshipId)
    reload()
  }

  async function handleDecline(friendshipId: number) {
    await declineRequest(friendshipId)
    reload()
  }

  async function handleRemove(friendshipId: number) {
    await removeFriend(friendshipId)
    reload()
  }

  if (error) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>Sign in to view friends</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>This page requires authentication.</p>
      </div>
    )
  }

  return (
    <div className="friends-page">
      <section className="friends-header">
        <div className="container">
          <h1 className="page-title">Friends</h1>
          {data && (
            <p className="page-subtitle">
              {data.friends.length} friend{data.friends.length !== 1 ? 's' : ''}
              {data.receivedRequests.length > 0 && ` · ${data.receivedRequests.length} pending request${data.receivedRequests.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      </section>

      <div className="container friends-body">
        {loading ? (
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
      </div>
    </div>
  )
}

function FriendRow({ friend, onRemove }: { friend: FriendDto; onRemove: () => void }) {
  const { friend: u } = friend
  return (
    <div className="friend-row">
      <Link to={`/users/${u.nickname}`} className="friend-info">
        <div className="friend-avatar">
          {u.userPicture
            ? <PixelArt matrix={u.userPicture} cellSize={6} />
            : <div className="avatar-ph" />
          }
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
          {u.userPicture
            ? <PixelArt matrix={u.userPicture} cellSize={6} />
            : <div className="avatar-ph" />
          }
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
          {u.userPicture
            ? <PixelArt matrix={u.userPicture} cellSize={6} />
            : <div className="avatar-ph" />
          }
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
