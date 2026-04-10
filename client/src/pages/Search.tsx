import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import TabBar from '../components/TabBar'
import ListCard, { fromCategoryDto } from '../components/ListCard'
import GameCard from '../components/GameCard'
import Paginator from '../components/Paginator'
import { search } from '../api/search'
import type { SearchResponse, Pager } from '../types'
import './Search.css'

type Tab = 'lists' | 'games' | 'users'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [input, setInput] = useState(query)
  const [activeTab, setActiveTab] = useState<Tab>('lists')
  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!query) return
    setLoading(true)
    search({ input: query, page, pageSize: 10 })
      .then(res => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [query, page])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim()) {
      setPage(1)
      setSearchParams({ q: input.trim() })
    }
  }

  function handlePageChange(p: number) {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tabs = [
    { key: 'lists', label: 'Lists', count: data?.lists.items.length },
    { key: 'games', label: 'Games', count: data?.games.items.length },
    { key: 'users', label: 'Users', count: data?.users.items.length },
  ]

  return (
    <div className="search-page">
      <section className="search-header">
        <div className="container">
          <h1 className="page-title">Search</h1>
          <form className="search-form" onSubmit={handleSubmit}>
            <div className="search-input-wrap">
              <span className="search-icon"><SearchIcon /></span>
              <input
                className="search-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Search games, lists, users…"
                autoFocus
              />
            </div>
            <button type="submit" className="search-btn">Search</button>
          </form>
        </div>
      </section>

      <div className="container search-body">
        {!query && (
          <p className="search-hint">Type something to search across games, lists and users.</p>
        )}

        {query && (
          <>
            <p className="search-results-label">
              Results for <strong>"{query}"</strong>
            </p>

            <TabBar
              tabs={tabs}
              active={activeTab}
              onChange={k => { setActiveTab(k as Tab); setPage(1) }}
            />

            {loading ? (
              <SearchSkeleton tab={activeTab} />
            ) : data ? (
              <>
                {activeTab === 'lists' && (
                  <SearchLists
                    items={data.lists.items}
                    pager={data.lists.pager as Pager}
                    onPageChange={handlePageChange}
                  />
                )}
                {activeTab === 'games' && (
                  <SearchGames
                    items={data.games.items}
                    pager={data.games.pager as Pager}
                    onPageChange={handlePageChange}
                  />
                )}
                {activeTab === 'users' && (
                  <SearchUsers
                    items={data.users.items}
                    pager={data.users.pager as Pager}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function SearchLists({ items, pager, onPageChange }: { items: SearchResponse['lists']['items']; pager: Pager; onPageChange: (p: number) => void }) {
  if (items.length === 0) return <EmptyResult label="No lists found" />
  return (
    <>
      <div className="lists-grid">
        {items.map(l => <ListCard key={l.id} list={fromCategoryDto(l)} />)}
      </div>
      <Paginator pager={pager} onPageChange={onPageChange} />
    </>
  )
}

function SearchGames({ items, pager, onPageChange }: { items: SearchResponse['games']['items']; pager: Pager; onPageChange: (p: number) => void }) {
  if (items.length === 0) return <EmptyResult label="No games found" />
  return (
    <>
      <div className="games-grid">
        {items.map(g => <GameCard key={g.id} game={g} />)}
      </div>
      <Paginator pager={pager} onPageChange={onPageChange} />
    </>
  )
}

function SearchUsers({ items, pager, onPageChange }: { items: SearchResponse['users']['items']; pager: Pager; onPageChange: (p: number) => void }) {
  if (items.length === 0) return <EmptyResult label="No users found" />
  return (
    <>
      <div className="users-list">
        {items.map(u => (
          <Link key={u.id} to={`/users/${u.nickname}`} className="user-row">
            <div className="user-row-avatar">{u.fullName.charAt(0).toUpperCase()}</div>
            <div className="user-row-info">
              <span className="user-row-name">{u.fullName}</span>
              <span className="user-row-nick">@{u.nickname}</span>
            </div>
            <span className="user-row-contrib">{u.contributions} contributions</span>
          </Link>
        ))}
      </div>
      <Paginator pager={pager} onPageChange={onPageChange} />
    </>
  )
}

function EmptyResult({ label }: { label: string }) {
  return <p className="no-results">{label}.</p>
}

function SearchSkeleton({ tab }: { tab: Tab }) {
  if (tab === 'lists') {
    return (
      <div className="lists-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="list-card-skeleton">
            <div className="skeleton covers-skeleton" />
            <div className="skeleton title-skeleton" />
            <div className="skeleton meta-skeleton" />
          </div>
        ))}
      </div>
    )
  }
  if (tab === 'games') {
    return (
      <div className="games-grid">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="game-card-skeleton">
            <div className="skeleton cover-skeleton" />
            <div className="skeleton title-skeleton" />
            <div className="skeleton meta-skeleton" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="users-list">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton user-row-skeleton" />
      ))}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
