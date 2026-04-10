import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Paginator from '../components/Paginator'
import { getListSuggestions, likeRequest, dislikeRequest } from '../api/listSuggestions'
import type { GameListRequestDto } from '../api/listSuggestions'
import type { Pager } from '../types'
import { timeAgo } from '../utils/time'
import './ListSuggestions.css'

export default function ListSuggestions() {
  const [items, setItems] = useState<GameListRequestDto[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [loading, setLoading] = useState(true)

  function load(page: number) {
    setLoading(true)
    getListSuggestions(page, 10)
      .then(res => { setItems(res.requests); setPager(res.pager) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(1) }, [])

  async function handleVote(id: number, type: 'like' | 'dislike') {
    try {
      if (type === 'like') await likeRequest(id)
      else await dislikeRequest(id)
      load(pager?.currentPage ?? 1)
    } catch { /* not authenticated — ignore */ }
  }

  return (
    <div className="suggestions-page">
      <section className="suggestions-header">
        <div className="container">
          <h1 className="page-title">List Suggestions</h1>
          <p className="page-subtitle">Community suggestions for new lists to aggregate.</p>
        </div>
      </section>

      <div className="container suggestions-body">
        {loading ? (
          <SuggestionsSkeleton />
        ) : items.length === 0 ? (
          <p className="empty-state">No suggestions yet.</p>
        ) : (
          <>
            <div className="suggestions-list">
              {items.map(item => (
                <SuggestionCard
                  key={item.id}
                  item={item}
                  onLike={() => handleVote(item.id, 'like')}
                  onDislike={() => handleVote(item.id, 'dislike')}
                />
              ))}
            </div>
            {pager && <Paginator pager={pager} onPageChange={load} />}
          </>
        )}
      </div>
    </div>
  )
}

function SuggestionCard({ item, onLike, onDislike }: {
  item: GameListRequestDto
  onLike: () => void
  onDislike: () => void
}) {
  return (
    <div className="suggestion-card">
      <div className="suggestion-main">
        <div className="suggestion-votes">
          <button className="vote-btn" onClick={onLike} title="Like">▲ {item.likes}</button>
          <button className="vote-btn vote-down" onClick={onDislike} title="Dislike">▼ {item.dislikes}</button>
        </div>
        <div className="suggestion-content">
          <div className="suggestion-meta">
            {item.finalGameList && (
              <Link to={`/list/${item.finalGameList.slug}`} className="suggestion-list-link">
                {item.finalGameList.fullName}
              </Link>
            )}
            <span className="suggestion-sep">·</span>
            <a href={item.sourceListUrl} target="_blank" rel="noopener noreferrer" className="suggestion-source">
              {item.sourceName} ↗
            </a>
          </div>
          <div className="suggestion-games">
            {item.games.slice(0, 5).map(g => (
              <Link key={g.id} to={`/games/${g.gameId}`} className="suggestion-game-chip">
                {g.position}. {g.gameTitle}
              </Link>
            ))}
            {item.games.length > 5 && (
              <span className="suggestion-more">+{item.games.length - 5} more</span>
            )}
          </div>
          <div className="suggestion-footer">
            {item.userPosted && (
              <Link to={`/users/${item.userPosted.nickname}`} className="suggestion-user">
                @{item.userPosted.nickname}
              </Link>
            )}
            <span className="suggestion-time">{timeAgo(item.dateAdded)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SuggestionsSkeleton() {
  return (
    <div className="suggestions-list">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="suggestion-card">
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="skeleton" style={{ width: 40, height: 60, borderRadius: 4 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 8, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
