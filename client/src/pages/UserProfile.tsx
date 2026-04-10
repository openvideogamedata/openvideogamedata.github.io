import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PixelArt from '../components/PixelArt'
import { getUserProfile, sendFriendRequest } from '../api/users'
import type { UserProfileDto, BadgeDto } from '../api/users'
import './UserProfile.css'

export default function UserProfile() {
  const { nickname } = useParams<{ nickname: string }>()
  const [profile, setProfile] = useState<UserProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [friendState, setFriendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    if (!nickname) return
    setLoading(true)
    setNotFound(false)
    getUserProfile(nickname)
      .then(res => { setProfile(res); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [nickname])

  async function handleAddFriend() {
    if (!nickname) return
    setFriendState('sending')
    try {
      await sendFriendRequest(nickname)
      setFriendState('sent')
    } catch {
      setFriendState('error')
    }
  }

  if (loading) return <UserProfileSkeleton />

  if (notFound || !profile) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>User not found</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          This user doesn't exist or their profile is private.
        </p>
      </div>
    )
  }

  const { gamification } = profile
  const friendPending = profile.alreadyRequestedFriend || friendState === 'sent'

  return (
    <div className="user-profile-page">
      <section className="user-profile-hero">
        <div className="container user-profile-hero-inner">
          <div className="user-avatar-wrap">
            {profile.userPicture ? (
              <PixelArt matrix={profile.userPicture} size={5} cellSize={14} className="user-avatar" />
            ) : (
              <div className="user-avatar user-avatar-placeholder" />
            )}
          </div>

          <div className="user-identity">
            <h1 className="user-fullname">{profile.fullName}</h1>
            <span className="user-nickname">@{profile.nickname}</span>
            {gamification && (
              <div className="user-stats">
                <div className="stat-chip">
                  <span className="stat-value">{gamification.contributions}</span>
                  <span className="stat-label">Lists</span>
                </div>
                <div className="stat-chip">
                  <span className="stat-value">{gamification.karma}</span>
                  <span className="stat-label">Karma</span>
                </div>
                <div className="stat-chip">
                  <span className="stat-value">#{gamification.rank}</span>
                  <span className="stat-label">Rank</span>
                </div>
              </div>
            )}
          </div>

          <div className="user-actions">
            {!profile.isLoggedUser && profile.loadedFriendship && (
              profile.alreadyFriend ? (
                <span className="friend-badge">Friends ✓</span>
              ) : (
                <button
                  className="btn-primary-sm"
                  onClick={handleAddFriend}
                  disabled={friendPending || friendState === 'sending'}
                >
                  {friendState === 'sending' ? 'Sending…' :
                   friendPending ? 'Requested' : 'Add Friend'}
                </button>
              )
            )}
            <Link to={`/users/${profile.nickname}/trackers`} className="btn-outline-sm">
              Trackers
            </Link>
            <Link to={`/users/${profile.nickname}/lists`} className="btn-outline-sm">
              Lists
            </Link>
          </div>
        </div>
      </section>

      <div className="container user-profile-body">
        {gamification && gamification.topList && (
          <div className="top-list-banner">
            <span className="top-list-label">Top list</span>
            <Link to={`/list/${gamification.topListSlug}`} className="top-list-name">
              {gamification.topList}
            </Link>
          </div>
        )}

        {gamification && gamification.badges.length > 0 && (
          <section className="profile-section">
            <h2 className="section-title">Badges</h2>
            <div className="profile-badges-grid">
              {gamification.badges.map(badge => (
                <BadgeTile key={badge.id} badge={badge} />
              ))}
            </div>
          </section>
        )}

        {gamification && gamification.badges.length === 0 && (
          <section className="profile-section">
            <h2 className="section-title">Badges</h2>
            <p className="empty-state">No badges earned yet.</p>
          </section>
        )}
      </div>
    </div>
  )
}

function BadgeTile({ badge }: { badge: BadgeDto }) {
  return (
    <div className="badge-tile" title={`${badge.name}: ${badge.description}`}>
      <div className="badge-tile-art">
        {badge.pixelArt ? (
          <PixelArt matrix={badge.pixelArt} size={5} cellSize={8} />
        ) : (
          <div className="badge-tile-placeholder" />
        )}
      </div>
      <span className="badge-tile-name">{badge.name}</span>
    </div>
  )
}

function UserProfileSkeleton() {
  return (
    <div className="user-profile-page">
      <section className="user-profile-hero">
        <div className="container user-profile-hero-inner">
          <div className="skeleton" style={{ width: 70, height: 70, borderRadius: 10 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 28, width: 200, marginBottom: 10, borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 16, width: 120, borderRadius: 4 }} />
          </div>
        </div>
      </section>
    </div>
  )
}
