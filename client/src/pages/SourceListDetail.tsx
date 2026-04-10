import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSourceList } from '../api/sourceList'
import type { SourceListResponse, GameListItemDto } from '../api/sourceList'
import './SourceListDetail.css'

const IGDB_COVER_URL = (id: string, big = false) =>
  `https://images.igdb.com/igdb/image/upload/t_${big ? 'cover_big' : 'cover_small'}/${id}.jpg`

function coverUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return IGDB_COVER_URL(url)
}

export default function SourceListDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<SourceListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getSourceList(id)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [id])

  if (loading) return <SourceListSkeleton />
  if (notFound || !data) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>List not found</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>This source list doesn't exist or was removed.</p>
      </div>
    )
  }

  const { list, creator, creatorNickname, friendComparison } = data
  const items = [...list.items].sort((a, b) => a.position - b.position)
  const masterList = list.finalGameList

  return (
    <div className="source-list-page">
      <section className="source-list-header">
        <div className="container">
          <div className="source-list-breadcrumb">
            {masterList && (
              <>
                <Link to={`/list/${masterList.slug}`} className="breadcrumb-link">
                  {masterList.fullName}
                </Link>
                <span className="breadcrumb-sep">›</span>
              </>
            )}
            <span className="breadcrumb-current">{creator}</span>
          </div>
          <h1 className="page-title">{creator}</h1>
          {masterList && (
            <p className="page-subtitle">
              Contributing to{' '}
              <Link to={`/list/${masterList.slug}`} className="master-list-link">
                {masterList.fullName}
              </Link>
            </p>
          )}
          <div className="source-list-meta">
            {list.source && (
              <a href={list.source.hostUrl} target="_blank" rel="noopener noreferrer" className="meta-pill">
                {list.source.name}
              </a>
            )}
            {creatorNickname && (
              <Link to={`/users/${creatorNickname}`} className="meta-pill">
                @{creatorNickname}
              </Link>
            )}
            {list.sourceListUrl && (
              <a href={list.sourceListUrl} target="_blank" rel="noopener noreferrer" className="meta-pill source-link">
                View original ↗
              </a>
            )}
            <span className="meta-pill meta-count">{items.length} games</span>
          </div>
        </div>
      </section>

      {friendComparison && (
        <div className="container">
          <div className="compat-banner">
            <span className="compat-label">Compatibility with your list</span>
            <span className="compat-value">{friendComparison.compatibilityPercentage}%</span>
            <span className="compat-detail">
              {friendComparison.coincidentGameIds.length} games in common
            </span>
          </div>
        </div>
      )}

      <div className="container source-list-body">
        <div className="game-list-items">
          {items.map(item => (
            <GameListItem
              key={item.id}
              item={item}
              highlighted={friendComparison?.coincidentGameIds.includes(item.gameId)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function GameListItem({ item, highlighted }: { item: GameListItemDto; highlighted?: boolean }) {
  const cover = coverUrl(item.coverImageUrl)

  return (
    <Link
      to={`/games/${item.gameId}`}
      className={`game-list-item ${highlighted ? 'highlighted' : ''}`}
    >
      <span className="item-position">{item.position}</span>
      {cover ? (
        <img src={cover} alt={item.gameTitle} className="item-cover" loading="lazy" />
      ) : (
        <div className="item-cover item-cover-placeholder" />
      )}
      <span className="item-title">{item.gameTitle}</span>
      {item.score > 0 && <span className="item-score">{item.score}</span>}
    </Link>
  )
}

function SourceListSkeleton() {
  return (
    <div className="source-list-page">
      <section className="source-list-header">
        <div className="container">
          <div className="skeleton" style={{ height: 14, width: 200, marginBottom: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 36, width: 320, marginBottom: 12, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 16, width: 240, borderRadius: 4 }} />
        </div>
      </section>
      <div className="container source-list-body">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
            <div className="skeleton" style={{ height: 20, width: 32, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 48, width: 36, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 16, width: 200, borderRadius: 4 }} />
          </div>
        ))}
      </div>
    </div>
  )
}
