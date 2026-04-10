import { useState, useEffect, useCallback, useRef } from 'react'
import ListCard, { fromHomeList } from '../components/ListCard'
import Paginator from '../components/Paginator'
import { getTags, getLists } from '../api/home'
import { type HomeList, type Pager } from '../types'
import { ListsSkeleton } from './Home'
import './Home.css'

export default function Lists() {
  const [tags, setTags] = useState<string[]>([])
  const [lists, setLists] = useState<HomeList[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [listsLoading, setListsLoading] = useState(true)
  const [activeTags, setActiveTags] = useState<string[]>(['all'])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const pageRef = useRef<HTMLElement>(null)

  const fetchLists = useCallback((page: number, tags: string[], searchText: string) => {
    setListsLoading(true)
    getLists({ page, pageSize: 6, tags: tags.join(','), search: searchText || undefined })
      .then(res => { setLists(res.lists); setPager(res.pager) })
      .catch(() => {})
      .finally(() => setListsLoading(false))
  }, [])

  useEffect(() => {
    getTags().then(setTags).catch(() => {})
    fetchLists(1, activeTags, search)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    pageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="home">
      <section className="section" ref={pageRef}>
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
        </div>
      </section>
    </div>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
