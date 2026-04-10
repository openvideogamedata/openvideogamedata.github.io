import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ListCard, { fromHomeList } from '../components/ListCard'
import UserAvatar from '../components/UserAvatar'
import { getPinnedLists, getUserActivity } from '../api/home'
import { timeAgo } from '../utils/time'
import { ActivityType, type HomeList, type HomeActivity } from '../types'
import './Home.css'

export default function Home() {
  const [pinned, setPinned] = useState<HomeList[]>([])
  const [pinnedLoading, setPinnedLoading] = useState(true)
  const [activity, setActivity] = useState<HomeActivity[]>([])

  const navigate = useNavigate()

  useEffect(() => {
    getPinnedLists()
      .then(setPinned)
      .catch(() => {})
      .finally(() => setPinnedLoading(false))
  }, [])

  useEffect(() => {
    const id = requestIdleCallback(
      () => { getUserActivity().then(setActivity).catch(() => {}) },
      { timeout: 5000 }
    )
    return () => cancelIdleCallback(id)
  }, [])

  return (
    <div className="home">
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Top Ranked Lists</h2>
              <p className="section-subtitle">The most referenced community rankings</p>
            </div>
          </div>
          {pinnedLoading ? (
            <ListsSkeleton count={4} />
          ) : (
            <>
              <div className="lists-grid">
                {pinned.map(list => <ListCard key={list.id} list={fromHomeList(list)} />)}
              </div>
              <div className="lists-more">
                <Link to="/lists" className="btn-primary">View more lists</Link>
              </div>
            </>
          )}
        </div>
      </section>

      {activity.length > 0 && (
        <section className="section activity-section">
          <div className="container">
            <div className="section-header">
              <div>
                <h2 className="section-title">Community Activity</h2>
                <p className="section-subtitle">What players have been doing lately</p>
              </div>
            </div>
            <div className="activity-grid">
              {activity.map((item, i) => <ActivityItem key={i} item={item} />)}
            </div>
            <div className="activity-cta">
              <button className="btn-primary" onClick={() => navigate('/lists/new')}>
                + Create your list
              </button>
              <span className="activity-cta-hint">Join the community and start contributing</span>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export function ListsSkeleton({ count }: { count: number }) {
  return (
    <div className="lists-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="list-card-skeleton">
          <div className="skeleton covers-skeleton" />
          <div className="skeleton title-skeleton" />
          <div className="skeleton meta-skeleton" />
        </div>
      ))}
    </div>
  )
}

function ActivityItem({ item }: { item: HomeActivity }) {
  const isListActivity = item.activity === ActivityType.GameList
  const avatar = item.user?.userPicture
  const userPath = toAppPath(item.userProfileUrl)
  const listPath = toAppPath(item.gameListUrl)
  const trackerPath = `${userPath}/trackers?trackStatus=${item.mostRecentTracker?.status ?? 0}`

  return (
    <div className="activity-item">
      <div className="activity-avatar">
        <UserAvatar userPicture={avatar} name={item.user?.fullName ?? ''} cellSize={4} className="pixel-avatar" />
      </div>
      <div className="activity-body">
        {isListActivity ? (
          <>
            <p>
              <Link to={userPath} className="activity-user">{item.user?.fullName}</Link>
              {' '}added{' '}
              {item.gameListName
                ? <Link to={listPath} className="activity-link">"{item.gameListName}"</Link>
                : 'a list'
              }
            </p>
            <span className="activity-time">{timeAgo(item.dateAdded)}</span>
          </>
        ) : (
          <>
            <p>
              <Link to={userPath} className="activity-user">{item.user?.fullName}</Link>
              {' '}tracked{' '}
              <Link to={trackerPath} className="activity-link">
                {item.itemsTracked} game{item.itemsTracked !== 1 ? 's' : ''}
              </Link>
            </p>
            <span className="activity-time">{timeAgo(item.dateAdded)}</span>
          </>
        )}
      </div>
    </div>
  )
}

function toAppPath(url: string): string {
  if (!url) return '/'
  const path = url.startsWith('http') ? new URL(url).pathname : url
  const sourceListMatch = path.match(/^\/view-list\/(\d+)$/)
  if (sourceListMatch) return `/source-lists/${sourceListMatch[1]}`
  return path.startsWith('/') ? path : `/${path}`
}
