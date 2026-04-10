import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ListCard from '../components/ListCard'
import Paginator from '../components/Paginator'
import { getHome, getLists } from '../api/home'
import { timeAgo } from '../utils/time'
import type { HomeList, HomeActivity, HomeResponse, Pager, ActivityType } from '../types'
import './Home.css'

export default function Home() {
  const [data, setData] = useState<HomeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // lists section state
  const [lists, setLists] = useState<HomeList[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [activeTags, setActiveTags] = useState<string[]>(['all'])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [listsLoading, setListsLoading] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    getHome({ pageSize: 6 })
      .then(res => {
        setData(res)
        setLists(res.listsCategories)
        setPager(res.pager as Pager)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const fetchLists = useCallback((page: number, tags: string[], searchText: string) => {
    setListsLoading(true)
    getLists({
      page,
      pageSize: 6,
      tags: tags.join(','),
      search: searchText || undefined,
    })
      .then(res => {
        setLists((res as { lists: HomeList[]; pager: Pager }).lists)
        setPager((res as { lists: HomeList[]; pager: Pager }).pager)
        setListsLoading(false)
      })
      .catch(() => setListsLoading(false))
  }, [])

  function toggleTag(tag: string) {
    let next: string[]
    if (tag === 'all') {
      next = ['all']
    } else {
      const without = activeTags.filter(t => t !== 'all')
      next = without.includes(tag)
        ? without.filter(t => t !== tag)
        : [...without, tag]
      if (next.length === 0) next = ['all']
    }
    setActiveTags(next)
    fetchLists(1, next, search)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    fetchLists(1, activeTags, searchInput)
  }

  function handlePageChange(page: number) {
    fetchLists(page, activeTags, search)
    document.getElementById('all-lists-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return <HomeSkeletonLoader />

  return (
    <div className="home">
      {/* ── Header ───────────────────────────────────────────── */}
      <section className="home-header">
        <div className="container home-header-inner">
          <div className="home-header-text">
            <div className="home-label">
              <span className="home-label-dot" />
              Community-curated database
            </div>
            <h1 className="home-title">
              <span className="home-title-plain">Open Video </span>
              <span className="home-title-accent">Game Data</span>
            </h1>
            <p className="home-subtitle">
              Aggregated rankings, community lists, and a tracker for every game across every generation.
            </p>
          </div>
        </div>
      </section>

      {/* ── Trending / Pinned Lists ───────────────────────────── */}
      {data && data.pinnedLists.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-header">
              <div>
                <div className="section-label">Trending <span className="section-label-line" /></div>
                <h2 className="section-title">Top Ranked Lists</h2>
                <p className="section-subtitle">The most referenced community rankings</p>
              </div>
            </div>
            <div className="lists-grid">
              {data.pinnedLists.map(list => (
                <ListCard key={list.id} list={list} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── User Activity ─────────────────────────────────────── */}
      {data && data.userActivity.length > 0 && (
        <section className="section activity-section">
          <div className="container">
            <div className="section-header">
              <div>
                <div className="section-label">Live feed <span className="section-label-line" /></div>
                <h2 className="section-title">Community Activity</h2>
                <p className="section-subtitle">What players have been doing lately</p>
              </div>
            </div>
            <div className="activity-grid">
              {data.userActivity.map((item, i) => (
                <ActivityItem key={i} item={item} />
              ))}
            </div>
            <div className="activity-cta">
              <button className="btn-primary" onClick={() => navigate('/users/lists/new')}>
                + Create your list
              </button>
              <span className="activity-cta-hint">Join the community and start contributing</span>
            </div>
          </div>
        </section>
      )}

      {/* ── All Game Lists ────────────────────────────────────── */}
      <section className="section" id="all-lists-section">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-label">Browse <span className="section-label-line" /></div>
              <h2 className="section-title">All Game Lists</h2>
              <p className="section-subtitle">Every ranking and curated list</p>
            </div>
          </div>

          <div className="lists-toolbar">
            <form className="lists-search-form" onSubmit={handleSearch}>
              <input
                className="lists-search-input"
                placeholder="Search lists…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              <button type="submit" className="lists-search-btn">Search</button>
            </form>
            {data && (
              <div className="tag-filters">
                {data.allTags.map(tag => (
                  <button
                    key={tag}
                    className={`tag-btn ${activeTags.includes(tag) ? 'active' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {capitalize(tag)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lists grid */}
          {listsLoading ? (
            <div className="lists-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="list-card-skeleton">
                  <div className="skeleton covers-skeleton" />
                  <div className="skeleton title-skeleton" />
                  <div className="skeleton meta-skeleton" />
                </div>
              ))}
            </div>
          ) : lists.length > 0 ? (
            <div className="lists-grid mt-4">
              {lists.map(list => (
                <ListCard key={list.id} list={list} />
              ))}
            </div>
          ) : (
            <p className="no-results">No lists found.</p>
          )}

          {pager && (
            <Paginator pager={pager} onPageChange={handlePageChange} />
          )}
        </div>
      </section>
    </div>
  )
}

function ActivityItem({ item }: { item: HomeActivity }) {
  const isListActivity = (item.activity as unknown as ActivityType) === 0
  const avatar = item.user?.userPicture

  return (
    <div className="activity-item">
      <div className="activity-avatar">
        {avatar && avatar.length > 0
          ? <PixelAvatar matrix={avatar} />
          : <div className="avatar-placeholder" />
        }
      </div>
      <div className="activity-body">
        {isListActivity ? (
          <>
            <p>
              <a href={item.userProfileUrl} className="activity-user">{item.user?.fullName}</a>
              {' '}added{' '}
              {item.gameListName
                ? <a href={item.gameListUrl} className="activity-link">"{item.gameListName}"</a>
                : 'a list'
              }
            </p>
            <span className="activity-time">{timeAgo(item.dateAdded)}</span>
          </>
        ) : (
          <>
            <p>
              <a href={item.userProfileUrl} className="activity-user">{item.user?.fullName}</a>
              {' '}tracked{' '}
              <a href={`${item.userProfileUrl}/trackers?trackStatus=${item.mostRecentTracker?.status ?? 0}`} className="activity-link">
                {item.itemsTracked} game{item.itemsTracked !== 1 ? 's' : ''}
              </a>
            </p>
            <span className="activity-time">{timeAgo(item.dateAdded)}</span>
          </>
        )}
      </div>
    </div>
  )
}

function PixelAvatar({ matrix }: { matrix: string[] }) {
  // matrix is an array of rows, each row is a string of color chars
  const size = 5
  const cellSize = 4
  const canvasSize = size * cellSize

  return (
    <svg
      width={canvasSize}
      height={canvasSize}
      viewBox={`0 0 ${canvasSize} ${canvasSize}`}
      className="pixel-avatar"
    >
      {matrix.slice(0, size).map((row, y) =>
        row.split('').slice(0, size).map((char, x) => (
          <rect
            key={`${x}-${y}`}
            x={x * cellSize}
            y={y * cellSize}
            width={cellSize}
            height={cellSize}
            fill={charToColor(char)}
          />
        ))
      )}
    </svg>
  )
}

const COLOR_MAP: Record<string, string> = {
  '0': '#7c3aed', '1': '#a78bfa', '2': '#06b6d4', '3': '#10b981',
  '4': '#f59e0b', '5': '#ef4444', '6': '#e2e8f0', '7': '#1e1e38',
  '8': '#6d28d9', '9': '#0e7490',
}
function charToColor(c: string): string {
  return COLOR_MAP[c] ?? '#1e1e38'
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function HomeSkeletonLoader() {
  return (
    <div className="home">
      <section className="home-header">
        <div className="container">
          <div className="skeleton" style={{ height: 40, width: 320, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 20, width: 480 }} />
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="skeleton" style={{ height: 28, width: 200, marginBottom: 24 }} />
          <div className="lists-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="list-card-skeleton">
                <div className="skeleton covers-skeleton" />
                <div className="skeleton title-skeleton" />
                <div className="skeleton meta-skeleton" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
