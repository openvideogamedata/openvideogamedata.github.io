import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ListCard, { fromHomeList } from '../components/ListCard'
import Paginator from '../components/Paginator'
import PixelArt from '../components/PixelArt'
import { getPinnedLists, getTags, getLists, getUserActivity } from '../api/home'
import { timeAgo } from '../utils/time'
import { ActivityType, type HomeList, type HomeActivity, type Pager } from '../types'
import './Home.css'

export default function Home() {
  // ── Onda 1: pinned + tags (paralelo, imediato) ──────────────
  const [pinned, setPinned] = useState<HomeList[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [pinnedLoading, setPinnedLoading] = useState(true)

  // ── Onda 2: all lists (IntersectionObserver) ─────────────────
  const [lists, setLists] = useState<HomeList[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [listsLoading, setListsLoading] = useState(false)
  const [listsTriggered, setListsTriggered] = useState(false)
  const [activeTags, setActiveTags] = useState<string[]>(['all'])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const allListsRef = useRef<HTMLElement>(null)

  // ── Onda 3: activity (requestIdleCallback) ───────────────────
  const [activity, setActivity] = useState<HomeActivity[]>([])

  const navigate = useNavigate()

  // Onda 1 — dispara as duas requests em paralelo
  useEffect(() => {
    Promise.all([getPinnedLists(), getTags()])
      .then(([p, t]) => { setPinned(p); setTags(t) })
      .catch(() => {})
      .finally(() => setPinnedLoading(false))
  }, [])

  // Onda 2 — observer no bloco "All Lists"
  useEffect(() => {
    const el = allListsRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setListsTriggered(true) },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [pinnedLoading])

  const fetchLists = useCallback((page: number, tags: string[], searchText: string) => {
    setListsLoading(true)
    getLists({ page, pageSize: 6, tags: tags.join(','), search: searchText || undefined })
      .then(res => { setLists(res.lists); setPager(res.pager) })
      .catch(() => {})
      .finally(() => setListsLoading(false))
  }, [])

  useEffect(() => {
    if (listsTriggered) fetchLists(1, activeTags, search)
  }, [listsTriggered]) // eslint-disable-line react-hooks/exhaustive-deps

  // Onda 3 — só quando o browser está ocioso
  useEffect(() => {
    const id = requestIdleCallback(
      () => { getUserActivity().then(setActivity).catch(() => {}) },
      { timeout: 5000 }
    )
    return () => cancelIdleCallback(id)
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
    allListsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="home">

      {/* ── Header — renderiza imediatamente, sem fetch ───────── */}
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

      {/* ── Onda 1a: Pinned Lists ─────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-label">Trending <span className="section-label-line" /></div>
              <h2 className="section-title">Top Ranked Lists</h2>
              <p className="section-subtitle">The most referenced community rankings</p>
            </div>
          </div>
          {pinnedLoading ? (
            <ListsSkeleton count={4} />
          ) : (
            <div className="lists-grid">
              {pinned.map(list => <ListCard key={list.id} list={fromHomeList(list)} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Onda 3: Activity — aparece quando disponível ─────── */}
      {activity.length > 0 && (
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

      {/* ── Onda 2: All Lists — lazy por IntersectionObserver ─── */}
      <section className="section" id="all-lists-section" ref={allListsRef}>
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-label">Browse <span className="section-label-line" /></div>
              <h2 className="section-title">All Game Lists</h2>
              <p className="section-subtitle">Every ranking and curated list</p>
            </div>
          </div>

          {listsTriggered && (
            <>
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
                {tags.length > 0 && (
                  <div className="tag-filters">
                    {tags.map(tag => (
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

              {listsLoading ? (
                <ListsSkeleton count={6} />
              ) : lists.length > 0 ? (
                <div className="lists-grid mt-4">
                  {lists.map(list => <ListCard key={list.id} list={fromHomeList(list)} />)}
                </div>
              ) : (
                <p className="no-results">No lists found.</p>
              )}

              {pager && <Paginator pager={pager} onPageChange={handlePageChange} />}
            </>
          )}

          {!listsTriggered && <ListsSkeleton count={6} />}
        </div>
      </section>
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────

function ActivityItem({ item }: { item: HomeActivity }) {
  const isListActivity = item.activity === ActivityType.GameList
  const avatar = item.user?.userPicture
  const userPath = toAppPath(item.userProfileUrl)
  const listPath = toAppPath(item.gameListUrl)
  const trackerPath = `${userPath}/trackers?trackStatus=${item.mostRecentTracker?.status ?? 0}`

  return (
    <div className="activity-item">
      <div className="activity-avatar">
        {avatar && avatar.length > 0
          ? <PixelArt matrix={avatar} cellSize={4} className="pixel-avatar" />
          : <div className="avatar-placeholder" />
        }
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

function ListsSkeleton({ count }: { count: number }) {
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function toAppPath(url: string): string {
  if (!url) return '/'
  const path = url.startsWith('http') ? new URL(url).pathname : url
  const sourceListMatch = path.match(/^\/view-list\/(\d+)$/)
  if (sourceListMatch) return `/source-lists/${sourceListMatch[1]}`
  return path.startsWith('/') ? path : `/${path}`
}
