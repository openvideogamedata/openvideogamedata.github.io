import { useState, useEffect, useCallback, useRef } from 'react'
import ListCard, { fromHomeList } from '../components/ListCard'
import { getTags, getLists } from '../api/home'
import { type HomeList } from '../types'
import './Home.css'

export default function Home() {
  const [pinned, setPinned] = useState<HomeList[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [lists, setLists] = useState<HomeList[]>([])
  const [listsLoading, setListsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [activeTags, setActiveTags] = useState<string[]>(['all'])
  const [searchInput, setSearchInput] = useState('')
  const sentinelRef = useRef<HTMLDivElement>(null)
  const nextPageRef = useRef(1)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)
  const activeTagsRef = useRef<string[]>(['all'])
  const searchRef = useRef('')

  useEffect(() => {
    fetch('/lists/pinned.json')
      .then(r => r.json())
      .then((payload: { data: any[] }) => {
        setPinned(payload.data.map(l => ({
          id: l.id,
          title: l.title,
          year: l.year,
          numberOfGames: l.numberOfGames,
          numberOfSources: l.numberOfSources,
          slug: l.slug,
          topThreeWinners: (l.topWinners ?? []).slice(0, 4).map((w: any) => ({
            gameId: w.gameId,
            gameTitle: w.gameTitle,
            coverImageUrl: w.coverImageUrl,
          })),
        })))
      })
      .catch(() => {})
  }, [])

  const loadPage = useCallback((page: number, tags: string[], searchText: string, append: boolean) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setListsLoading(true)
    getLists({ page, pageSize: 9, tags: tags.join(','), search: searchText || undefined })
      .then(res => {
        setLists(prev => append ? [...prev, ...res.lists] : res.lists)
        nextPageRef.current = page + 1
        const more = page < res.pager.totalPages
        hasMoreRef.current = more
        setHasMore(more)
      })
      .catch(() => {})
      .finally(() => {
        loadingRef.current = false
        setListsLoading(false)
      })
  }, [])

  useEffect(() => {
    getTags().then(setTags).catch(() => {})
    loadPage(1, ['all'], '', false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loadingRef.current && hasMoreRef.current) {
          loadPage(nextPageRef.current, activeTagsRef.current, searchRef.current, true)
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadPage])

  function reset(tags: string[], searchText: string) {
    nextPageRef.current = 1
    hasMoreRef.current = true
    setHasMore(true)
    loadPage(1, tags, searchText, false)
  }

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
    activeTagsRef.current = next
    setActiveTags(next)
    reset(next, searchRef.current)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    searchRef.current = searchInput
    reset(activeTagsRef.current, searchInput)
  }

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
          <div className="lists-grid">
            {pinned.map(list => <ListCard key={list.id} list={fromHomeList(list)} />)}
          </div>
        </div>
      </section>

      <section className="section aggregator-section">
        <div className="container">
          <AggregatorDiagram />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">All Game Lists</h2>
              <p className="section-subtitle">Every ranking and curated list</p>
            </div>
          </div>

          <div className="lists-toolbar">
            <form className="lists-search-form" onSubmit={handleSearch}>
              <input
                className="lists-search-input"
                placeholder="Search lists..."
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

          <div className="lists-grid mt-4">
            {lists.map(list => <ListCard key={list.id} list={fromHomeList(list)} />)}
            {listsLoading && (
              Array.from({ length: lists.length === 0 ? 9 : 3 }).map((_, i) => (
                <div key={i} className="list-card-skeleton">
                  <div className="skeleton covers-skeleton" />
                  <div className="skeleton title-skeleton" />
                  <div className="skeleton meta-skeleton" />
                </div>
              ))
            )}
          </div>

          <div ref={sentinelRef} className="scroll-sentinel" />
          {!hasMore && lists.length > 0 && (
            <p className="lists-end">All lists loaded</p>
          )}
        </div>
      </section>
    </div>
  )
}


const AGG_SOURCES = [
  { origin: 'IGN', name: 'Top 100 Games of All Time' },
  { origin: 'Metacritic', name: 'Best-Reviewed Games' },
  { origin: 'GameSpot', name: 'Greatest Games Ever Made' },
  { origin: 'Eurogamer', name: 'Essential Games' },
]

const AGG_RANKS = [
  'The Witcher 3: Wild Hunt',
  'Elden Ring',
  'Red Dead Redemption 2',
]

function AggregatorDiagram() {
  return (
    <div className="agg-diagram">
      <div className="agg-intro">
        <h2 className="section-title">How Rankings Are Built</h2>
        <p className="section-subtitle">
          Like Metacritic or OpenCritic, but for ranked lists instead of scores. We collect curated lists from critics, journalists, and the community — then merge them into a single objective ranking.
        </p>
      </div>
      <div className="agg-flow">
        <div className="agg-sources">
          {AGG_SOURCES.map((s, i) => (
            <div key={i} className="agg-source-card">
              <span className="agg-origin-badge">{s.origin}</span>
              <span className="agg-source-name">{s.name}</span>
            </div>
          ))}
        </div>

        <div className="agg-connector" aria-hidden="true">
          <div className="agg-bracket" />
          <div className="agg-arrow-line" />
        </div>

        <div className="agg-result-card">
          <div className="agg-result-label">Aggregated Result</div>
          <div className="agg-result-title">All-Time Best Games</div>
          <ol className="agg-rank-list">
            {AGG_RANKS.map((name, i) => (
              <li key={i}>
                <span className="agg-rank-num">{i + 1}</span>
                {name}
              </li>
            ))}
          </ol>
          <p className="agg-result-sources">compiled from {AGG_SOURCES.length} source lists</p>
        </div>
      </div>
    </div>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
