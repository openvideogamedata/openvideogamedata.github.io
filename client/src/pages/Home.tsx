import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ListCard, { fromHomeList } from '../components/ListCard'
import Paginator from '../components/Paginator'
import PixelArt from '../components/PixelArt'
import { getHome, getLists } from '../api/home'
import { timeAgo } from '../utils/time'
import type { HomeList, HomeActivity, HomeResponse, Pager } from '../types'
import './Home.css'

export default function Home() {
  // Above-fold: pinned lists + activity + tags
  const [aboveFold, setAboveFold] = useState<HomeResponse | null>(null)
  const [aboveLoading, setAboveLoading] = useState(true)

  // Below-fold: all lists (lazy — only fires when scrolled near)
  const [lists, setLists] = useState<HomeList[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [listsLoading, setListsLoading] = useState(false)
  const [listsTriggered, setListsTriggered] = useState(false)
  const [activeTags, setActiveTags] = useState<string[]>(['all'])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const allListsRef = useRef<HTMLElement>(null)

  const navigate = useNavigate()

  // Phase 1: load above-fold — minimal pageSize so backend sends fewer list rows
  useEffect(() => {
    getHome({ pageSize: 4 })
      .then(res => { setAboveFold(res); setAboveLoading(false) })
      .catch(() => setAboveLoading(false))
  }, [])

  // Phase 2: observe when all-lists section enters viewport, then trigger load
  useEffect(() => {
    const el = allListsRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setListsTriggered(true) },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [aboveLoading]) // re-attach after above-fold renders

  const fetchLists = useCallback((page: number, tags: string[], searchText: string) => {
    setListsLoading(true)
    getLists({ page, pageSize: 6, tags: tags.join(','), search: searchText || undefined })
      .then(res => {
        setLists(res.lists)
        setPager(res.pager as Pager)
        setListsLoading(false)
      })
      .catch(() => setListsLoading(false))
  }, [])

  // Phase 3: fire lists request when triggered
  useEffect(() => {
    if (listsTriggered) fetchLists(1, activeTags, search)
  }, [listsTriggered]) // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* ── Header — renders immediately ─────────────────────── */}
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

      {/* ── Pinned Lists ──────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-label">Trending <span className="section-label-line" /></div>
              <h2 className="section-title">Top Ranked Lists</h2>
              <p className="section-subtitle">The most referenced community rankings</p>
            </div>
          </div>
          {aboveLoading ? (
            <PinnedSkeleton />
          ) : aboveFold && aboveFold.pinnedLists.length > 0 ? (
            <div className="lists-grid">
              {aboveFold.pinnedLists.map(list => (
                <ListCard key={list.id} list={fromHomeList(list)} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Activity Feed ─────────────────────────────────────── */}
      {!aboveLoading && aboveFold && aboveFold.userActivity.length > 0 && (
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
              {aboveFold.userActivity.map((item, i) => (
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

      {/* ── All Game Lists — lazy ─────────────────────────────── */}
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
                {aboveFold && (
                  <div className="tag-filters">
                    {aboveFold.allTags.map(tag => (
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
                    <ListCard key={list.id} list={fromHomeList(list)} />
                  ))}
                </div>
              ) : (
                <p className="no-results">No lists found.</p>
              )}

              {pager && <Paginator pager={pager} onPageChange={handlePageChange} />}
            </>
          )}

          {!listsTriggered && (
            <div className="lists-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="list-card-skeleton">
                  <div className="skeleton covers-skeleton" />
                  <div className="skeleton title-skeleton" />
                  <div className="skeleton meta-skeleton" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ActivityItem({ item }: { item: HomeActivity }) {
  const isListActivity = (item.activity as unknown as number) === 0
  const avatar = item.user?.userPicture

  return (
    <div className="activity-item">
      <div className="activity-avatar">
        {avatar && avatar.length > 0
          ? <PixelArt matrix={avatar} size={5} cellSize={4} className="pixel-avatar" />
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

function PinnedSkeleton() {
  return (
    <div className="lists-grid">
      {Array.from({ length: 4 }).map((_, i) => (
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
