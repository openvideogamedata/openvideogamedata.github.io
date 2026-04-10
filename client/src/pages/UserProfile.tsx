import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import PixelArt from '../components/PixelArt'
import PixelEditor from '../components/PixelEditor'
import UserAvatar from '../components/UserAvatar'
import { getUserProfile, sendFriendRequest, checkNicknameAvailability, updateNickname, updatePixelArt, deleteAccount } from '../api/users'
import type { UserProfileDto, BadgeDto } from '../api/users'
import { useAuth } from '../context/AuthContext'
import { generateDefaultPixelArt } from '../utils/pixelArt'
import './UserProfile.css'

export default function UserProfile() {
  const { nickname } = useParams<{ nickname: string }>()
  const navigate = useNavigate()
  useAuth() // hydrate context; actual user data comes from profile.isLoggedUser
  const [profile, setProfile] = useState<UserProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [friendState, setFriendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Nickname editing
  const [editNick, setEditNick] = useState('')
  const [nickAvailable, setNickAvailable] = useState<boolean | null>(null)
  const [nickChecking, setNickChecking] = useState(false)
  const [nickSaving, setNickSaving] = useState(false)
  const nickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pixel art editing
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [draftMatrix, setDraftMatrix] = useState<string[]>([])
  const [avatarSaving, setAvatarSaving] = useState(false)

  useEffect(() => {
    if (!nickname) return
    setLoading(true)
    setNotFound(false)
    getUserProfile(nickname)
      .then(res => {
        setProfile(res)
        setEditNick(res.nickname)
        setLoading(false)
      })
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

  function handleNickChange(val: string) {
    setEditNick(val)
    setNickAvailable(null)
    if (nickTimerRef.current) clearTimeout(nickTimerRef.current)
    if (!val || val === profile?.nickname) return
    if (val.includes(' ')) { setNickAvailable(false); return }
    nickTimerRef.current = setTimeout(async () => {
      setNickChecking(true)
      try {
        const res = await checkNicknameAvailability(val)
        setNickAvailable(res.available)
      } catch { setNickAvailable(false) }
      setNickChecking(false)
    }, 500)
  }

  async function handleNickSave() {
    if (!editNick || !nickAvailable) return
    setNickSaving(true)
    try {
      await updateNickname(editNick)
      navigate(`/users/${editNick}`, { replace: true })
    } catch { /* silent */ }
    setNickSaving(false)
  }

  function startAvatarEdit() {
    const source = profile?.userPicture ?? generateDefaultPixelArt(profile?.fullName || profile?.nickname || '')
    setDraftMatrix([...source])
    setEditingAvatar(true)
  }

  async function saveAvatar() {
    setAvatarSaving(true)
    try {
      await updatePixelArt(draftMatrix)
      setProfile(prev => prev ? { ...prev, userPicture: draftMatrix } : prev)
      setEditingAvatar(false)
    } catch { /* silent */ }
    setAvatarSaving(false)
  }

  async function handleDeleteAccount() {
    if (!profile) return
    const confirmed = window.confirm(
      'All friend connections, personal lists, badges and trackers will be PERMANENTLY deleted. Are you sure?\n\nIf you log in again, a new account will be created.'
    )
    if (!confirmed) return
    try {
      await deleteAccount()
      navigate('/')
      window.location.reload()
    } catch { /* silent */ }
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
  const rankLabel = gamification?.rank === 1 ? `${gamification.rank} 🥇`
    : gamification?.rank === 2 ? `${gamification.rank} 🥈`
    : gamification?.rank === 3 ? `${gamification.rank} 🥉`
    : gamification?.rank ? `#${gamification.rank}` : '-'

  return (
    <div className="user-profile-page">
      <section className="user-profile-hero">
        <div className="container user-profile-hero-inner">
          {/* Avatar */}
          <div className="user-avatar-wrap">
            {editingAvatar ? (
              <div className="avatar-editor-wrap">
                <PixelEditor matrix={draftMatrix} gridSize={8} cellSize={22} onChange={setDraftMatrix} />
                <div className="avatar-editor-actions">
                  <button className="btn-primary-sm" onClick={saveAvatar} disabled={avatarSaving}>
                    {avatarSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn-outline-sm" onClick={() => setEditingAvatar(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="avatar-static-wrap">
                <UserAvatar
                  userPicture={profile.userPicture}
                  name={profile.fullName || profile.nickname}
                  cellSize={14}
                  className="user-avatar"
                />
                {profile.isLoggedUser && (
                  <button className="avatar-edit-btn" onClick={startAvatarEdit} title="Edit avatar">✏</button>
                )}
              </div>
            )}
          </div>

          <div className="user-identity">
            <h1 className="user-fullname">{profile.fullName}</h1>

            {/* Nickname (editable for own profile) */}
            {profile.isLoggedUser ? (
              <div className="nick-edit-row">
                <input
                  className="nick-input"
                  value={editNick}
                  onChange={e => handleNickChange(e.target.value)}
                  placeholder="nickname"
                />
                {editNick !== profile.nickname && (
                  <>
                    {nickChecking && <span className="nick-status">checking…</span>}
                    {!nickChecking && nickAvailable === true && (
                      <span className="nick-status nick-ok">available ✓</span>
                    )}
                    {!nickChecking && nickAvailable === false && (
                      <span className="nick-status nick-err">
                        {editNick.includes(' ') ? 'no spaces allowed' : 'taken'}
                      </span>
                    )}
                    <button
                      className="btn-primary-sm"
                      onClick={handleNickSave}
                      disabled={!nickAvailable || nickSaving || nickChecking}
                    >
                      {nickSaving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <span className="user-nickname">@{profile.nickname}</span>
            )}

            {gamification && (
              <div className="user-stats">
                <Link to="/top-contributors" className="stat-chip stat-chip-link">
                  <span className="stat-value">{rankLabel}</span>
                  <span className="stat-label">Rank</span>
                </Link>
                <div className="stat-chip">
                  <span className="stat-value">{gamification.contributions}</span>
                  <span className="stat-label">Lists</span>
                </div>
                <div className="stat-chip">
                  <span className="stat-value">{gamification.karma}</span>
                  <span className="stat-label">Karma</span>
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
            {profile.isLoggedUser && (
              <>
                <Link to="/notifications" className="btn-outline-sm notif-link">
                  Notifications
                  {profile.hasNotifications && <span className="notif-dot" />}
                </Link>
                <Link to="/friends" className="btn-outline-sm">Friends</Link>
              </>
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

        {profile.isLoggedUser && (
          <div className="danger-zone">
            <button className="delete-account-btn" onClick={handleDeleteAccount}>
              delete account
            </button>
          </div>
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
          <PixelArt matrix={badge.pixelArt} cellSize={8} />
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
