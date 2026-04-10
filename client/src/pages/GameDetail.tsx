import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Paginator from '../components/Paginator'
import { getGame, getCitations } from '../api/games'
import type { GameDetailResponse, CitationsResponse, Pager } from '../types'
import './GameDetail.css'

export default function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<GameDetailResponse | null>(null)
  const [citations, setCitations] = useState<CitationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [citLoading, setCitLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getGame(Number(id))
      .then(res => { setData(res); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })

    getCitations(Number(id))
      .then(setCitations)
  }, [id])

  function loadCitationsPage(page: number) {
    if (!id) return
    setCitLoading(true)
    getCitations(Number(id), page)
      .then(res => { setCitations(res); setCitLoading(false) })
      .catch(() => setCitLoading(false))
  }

  if (loading) return <GameDetailSkeleton />
  if (notFound || !data) return (
    <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>Game not found.</p>
      <Link to="/games" style={{ color: 'var(--purple-light)', marginTop: 12, display: 'inline-block' }}>← Back to games</Link>
    </div>
  )

  const { game, citationsSummary } = data
  const score = game.score

  return (
    <div className="game-detail-page">
      <div className="container">
        <div className="game-detail-layout">
          {/* Cover */}
          <aside className="game-detail-aside">
            <div className="game-cover-wrap">
              <img
                src={game.coverBigImageUrl || game.coverImageUrl}
                alt={game.title}
                className="game-cover-img"
                onError={e => { (e.target as HTMLImageElement).src = 'https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png' }}
              />
              {score > 0 && (
                <div className={`game-score-badge ${scoreClass(score)}`}>
                  <span className="score-value">{score}</span>
                  <span className="score-max">/100</span>
                </div>
              )}
            </div>
          </aside>

          {/* Main info */}
          <main className="game-detail-main">
            <p className="game-detail-year">{game.releaseYear}</p>
            <h1 className="game-detail-title">{game.title}</h1>

            {/* Citations summary */}
            {citationsSummary && citationsSummary.numberOfCategories > 0 && (
              <div className="citations-summary">
                <div className="citations-stat">
                  <span className="stat-value">{citationsSummary.numberOfCategories}</span>
                  <span className="stat-label">categories</span>
                </div>
                {citationsSummary.mostCitedCategory && (
                  <div className="citations-top">
                    Most cited in{' '}
                    <Link to={`/list/${citationsSummary.mostCitedCategoryUrl}`} className="citations-top-link">
                      "{citationsSummary.mostCitedCategory}"
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Tracker placeholder */}
            <div className="tracker-placeholder">
              <p className="tracker-placeholder-text">
                <Link to="/login" className="tracker-login-link">Sign in</Link> to track this game
              </p>
            </div>
          </main>
        </div>

        {/* Citations list */}
        {citations && citations.citations.length > 0 && (
          <section className="citations-section">
            <h2 className="citations-title">
              Lists this game appears in
              <span className="citations-count">{citations.citations.length} entries</span>
            </h2>
            <div className={`citations-list ${citLoading ? 'loading' : ''}`}>
              {citations.citations.map(c => (
                <div key={c.id} className="citation-row">
                  <span className="citation-position">#{c.position}</span>
                  <div className="citation-info">
                    {c.sourceName && c.sourceListUrl && (
                      <a href={c.sourceListUrl} target="_blank" rel="noopener noreferrer" className="citation-source">
                        {c.sourceName}
                      </a>
                    )}
                    {c.finalGameListName && c.finalGameListSlug && (
                      <Link to={`/list/${c.finalGameListSlug}`} className="citation-list">
                        {c.finalGameListName}
                      </Link>
                    )}
                  </div>
                  <span className="citation-score">{c.score} pts</span>
                </div>
              ))}
            </div>
            {citations.pager && (
              <Paginator
                pager={citations.pager as Pager}
                onPageChange={loadCitationsPage}
              />
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function scoreClass(score: number): string {
  if (score >= 85) return 'score-great'
  if (score >= 70) return 'score-good'
  if (score >= 50) return 'score-ok'
  return 'score-low'
}

function GameDetailSkeleton() {
  return (
    <div className="game-detail-page">
      <div className="container">
        <div className="game-detail-layout">
          <aside className="game-detail-aside">
            <div className="skeleton" style={{ width: 200, height: 280, borderRadius: 'var(--radius-lg)' }} />
          </aside>
          <main className="game-detail-main">
            <div className="skeleton" style={{ height: 16, width: 60, marginBottom: 12, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 36, width: 320, marginBottom: 20, borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 80, width: '100%', borderRadius: 'var(--radius)' }} />
          </main>
        </div>
      </div>
    </div>
  )
}
