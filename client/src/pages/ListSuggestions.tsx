import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Paginator from '../components/Paginator'
import { getListSuggestions, likeRequest, dislikeRequest, deleteRequest } from '../api/listSuggestions'
import type { GameListRequestDto } from '../api/listSuggestions'
import type { Pager } from '../types'
import { timeAgo } from '../utils/time'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'
import './ListSuggestions.css'

type Tab = 'all' | 'mine'

export default function ListSuggestions() {
  const { user, isAdmin, refresh } = useAuth()
  const [tab, setTab] = useState<Tab>('all')
  const [items, setItems] = useState<GameListRequestDto[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [loading, setLoading] = useState(true)
  const [votingId, setVotingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function load(page: number, mine: boolean = tab === 'mine') {
    setLoading(true)
    getListSuggestions(page, 10, undefined, mine)
      .then(res => { setItems(res.requests); setPager(res.pager) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(1, tab === 'mine') }, [tab])

  async function handleVote(id: number, type: 'like' | 'dislike') {
    if (!user) { return }
    if (votingId !== null) return
    setVotingId(id)
    try {
      if (type === 'like') await likeRequest(id)
      else await dislikeRequest(id)
      load(pager?.currentPage ?? 1)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        refresh()
      }
    } finally {
      setVotingId(null)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this suggestion?')) return
    setDeletingId(id)
    try {
      await deleteRequest(id)
      load(pager?.currentPage ?? 1)
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="suggestions-page">
      <section className="suggestions-header">
        <div className="container">
          <h1 className="page-title">List Suggestions</h1>
          <p className="page-subtitle">Community suggestions for new lists to aggregate.</p>
          {isAdmin && (
            <Link to="/admin/list-suggestions" className="suggestions-admin-link">
              Manage suggestions (admin) →
            </Link>
          )}
        </div>
      </section>

      <div className="container suggestions-body">
        {user && (
          <div className="suggestions-tabs">
            <button
              className={`suggestions-tab ${tab === 'all' ? 'active' : ''}`}
              onClick={() => setTab('all')}
            >
              All
            </button>
            <button
              className={`suggestions-tab ${tab === 'mine' ? 'active' : ''}`}
              onClick={() => setTab('mine')}
            >
              My Suggestions
            </button>
          </div>
        )}

        {loading ? (
          <SuggestionsSkeleton />
        ) : items.length === 0 ? (
          <p className="empty-state">
            {tab === 'mine' ? "You haven't submitted any suggestions yet." : 'No suggestions yet.'}
          </p>
        ) : (
          <>
            <div className="suggestions-list">
              {items.map(item => (
                <SuggestionCard
                  key={item.id}
                  item={item}
                  voting={votingId === item.id}
                  deleting={deletingId === item.id}
                  showDelete={tab === 'mine'}
                  onLike={() => handleVote(item.id, 'like')}
                  onDislike={() => handleVote(item.id, 'dislike')}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
            {pager && <Paginator pager={pager} onPageChange={p => load(p)} />}
          </>
        )}
      </div>
    </div>
  )
}

function SuggestionCard({ item, voting, deleting, showDelete, onLike, onDislike, onDelete }: {
  item: GameListRequestDto
  voting: boolean
  deleting: boolean
  showDelete: boolean
  onLike: () => void
  onDislike: () => void
  onDelete: () => void
}) {
  return (
    <div className="suggestion-card">
      <div className="suggestion-main">
        <div className="suggestion-votes">
          {voting ? (
            <span className="vote-spinner" />
          ) : (
            <>
              <button className="vote-btn" onClick={onLike} title="Like">▲ {item.likes}</button>
              <button className="vote-btn vote-down" onClick={onDislike} title="Dislike">▼ {item.dislikes}</button>
            </>
          )}
        </div>
        <div className="suggestion-content">
          <div className="suggestion-meta">
            {item.finalGameList && (
              <>
                <Link to={`/list/${item.finalGameList.slug}`} className="suggestion-list-link">
                  {item.finalGameList.fullName}
                </Link>
                <span className="suggestion-sep">·</span>
              </>
            )}
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
            {showDelete && (
              <button
                className="suggestion-delete-btn"
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting ? '…' : 'Delete'}
              </button>
            )}
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
