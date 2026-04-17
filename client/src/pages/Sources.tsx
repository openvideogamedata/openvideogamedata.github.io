import { useEffect, useMemo, useState } from 'react'
import Paginator from '../components/Paginator'
import { getSources, type SourceAggregateDto } from '../api/gameLists'
import type { Pager } from '../types'
import './Sources.css'

export default function Sources() {
  const [sources, setSources] = useState<SourceAggregateDto[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    setError(false)
    getSources(page, 15, search)
      .then(response => {
        setSources(response.sources)
        setPager(response.pager as Pager)
      })
      .catch(() => {
        setSources([])
        setPager(null)
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [page, search])

  const totals = useMemo(() => {
    return {
      sources: pager?.totalItems ?? sources.length,
      lists: sources.reduce((sum, source) => sum + source.listsCount, 0),
    }
  }, [pager?.totalItems, sources])

  function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="sources-page">
      <section className="sources-hero">
        <div className="container sources-hero-inner">
          <div>
            <span className="sources-kicker">Sources Index</span>
            <h1>Every critic source used by OpenVGD.</h1>
            <p className="sources-lead">
              Explore all websites that contributed lists to the database, ordered by the sources with the most published lists.
            </p>
          </div>
          <div className="sources-summary">
            <div className="sources-summary-card">
              <span>Sources</span>
              <strong>{totals.sources}</strong>
            </div>
            <div className="sources-summary-card">
              <span>Published lists</span>
              <strong>{totals.lists}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="sources-section">
        <div className="container">
          <div className="sources-toolbar">
            <form className="sources-search-form" onSubmit={handleSearch}>
              <input
                className="sources-search-input"
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="Search by source name or domain"
              />
              <button type="submit" className="sources-search-button">Search</button>
            </form>
            <p className="sources-toolbar-note">Ordered by total lists, descending.</p>
          </div>

          {loading ? (
            <div className="sources-list">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="skeleton" style={{ height: 96, borderRadius: 22 }} />
              ))}
            </div>
          ) : error ? (
            <div className="sources-empty">
              <h2>Could not load sources</h2>
              <p>Try again in a moment.</p>
            </div>
          ) : sources.length === 0 ? (
            <div className="sources-empty">
              <h2>No sources found</h2>
              <p>Try another name or domain.</p>
            </div>
          ) : (
            <div className="sources-list">
              {sources.map(source => (
                <article key={source.id} className="source-card">
                  <div className="source-card-main">
                    <div className="source-card-head">
                      <h2>{source.name}</h2>
                      <a href={normalizeHost(source.hostUrl)} target="_blank" rel="noopener noreferrer">
                        {source.hostUrl}
                      </a>
                    </div>
                    <p>
                      {source.listsCount} list{source.listsCount !== 1 ? 's' : ''} across {source.categoriesCount} categor{source.categoriesCount === 1 ? 'y' : 'ies'}.
                    </p>
                  </div>
                  <div className="source-card-metrics">
                    <div className="source-metric">
                      <span>Lists</span>
                      <strong>{source.listsCount}</strong>
                    </div>
                    <div className="source-metric">
                      <span>Master lists</span>
                      <strong>{source.categoriesCount}</strong>
                    </div>
                    <div className="source-metric">
                      <span>Last activity</span>
                      <strong>{formatDate(source.lastActivity)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {pager && <Paginator pager={pager} onPageChange={handlePageChange} />}
        </div>
      </section>
    </div>
  )
}

function normalizeHost(hostUrl: string): string {
  if (hostUrl.startsWith('http://') || hostUrl.startsWith('https://')) return hostUrl
  return `https://${hostUrl}`
}

function formatDate(value: string | null): string {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString()
}
