import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Paginator from '../components/Paginator'
import { useAuth } from '../context/AuthContext'
import {
  getListSuggestions,
  approveRequest,
  updateVisibility,
  deleteRequest,
} from '../api/listSuggestions'
import type { GameListRequestDto } from '../api/listSuggestions'
import type { Pager } from '../types'
import { timeAgo } from '../utils/time'
import './AdminListSuggestions.css'

type Filter = 'all' | 'visible' | 'hidden'

export default function AdminListSuggestions() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const [items, setItems] = useState<GameListRequestDto[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [actionId, setActionId] = useState<number | null>(null)
  const [approvedIds, setApprovedIds] = useState<Set<number>>(new Set())
  const [feedback, setFeedback] = useState<{ id: number; msg: string; ok: boolean } | null>(null)

  const load = useCallback((page: number) => {
    setLoading(true)
    getListSuggestions(page, 15)
      .then(res => { setItems(res.requests); setPager(res.pager); setCurrentPage(page) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!authLoading && isAdmin) load(1)
  }, [authLoading, isAdmin, load])

  async function handleApprove(id: number) {
    setActionId(id)
    try {
      const res = await approveRequest(id)
      setApprovedIds(prev => new Set(prev).add(id))
      setFeedback({ id, msg: res.message ?? 'Aprovada.', ok: true })
    } catch {
      setFeedback({ id, msg: 'Falha ao aprovar.', ok: false })
    } finally {
      setActionId(null)
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  async function handleToggleVisibility(item: GameListRequestDto) {
    setActionId(item.id)
    try {
      await updateVisibility(item.id, item.hidden)
      load(currentPage)
    } catch {
      setFeedback({ id: item.id, msg: 'Falha ao alterar visibilidade.', ok: false })
      setTimeout(() => setFeedback(null), 3000)
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Deletar esta sugestão?')) return
    setActionId(id)
    try {
      await deleteRequest(id)
      load(currentPage)
    } catch {
      setFeedback({ id, msg: 'Falha ao deletar.', ok: false })
      setTimeout(() => setFeedback(null), 3000)
    } finally {
      setActionId(null)
    }
  }

  if (authLoading) return null

  if (!user || !isAdmin) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>Access denied</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Admin only.</p>
      </div>
    )
  }

  const filtered = items.filter(item => {
    if (filter === 'visible') return !item.hidden
    if (filter === 'hidden') return item.hidden
    return true
  })

  return (
    <div className="admin-ls-page">
      <section className="admin-header">
        <div className="container">
          <div className="admin-breadcrumb">Admin</div>
          <h1 className="page-title">List Suggestions</h1>
          <p className="page-subtitle" style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.9rem' }}>
            Listas submetidas pela comunidade para aprovação.
          </p>
        </div>
      </section>

      <div className="container admin-body">
        <div className="admin-ls-toolbar">
          <div className="admin-ls-filters">
            {(['all', 'visible', 'hidden'] as Filter[]).map(f => (
              <button
                key={f}
                className={`admin-ls-filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Todas' : f === 'visible' ? 'Visíveis' : 'Ocultas'}
              </button>
            ))}
          </div>
          {pager && (
            <span className="admin-ls-count">
              {pager.totalItems} sugestão(ões) no total
            </span>
          )}
        </div>

        {loading ? (
          <AdminSuggestionsSkeleton />
        ) : filtered.length === 0 ? (
          <p className="empty-state">Nenhuma sugestão encontrada.</p>
        ) : (
          <>
            <div className="admin-ls-list">
              {filtered.map(item => (
                <AdminSuggestionCard
                  key={item.id}
                  item={item}
                  busy={actionId === item.id}
                  approved={approvedIds.has(item.id)}
                  feedback={feedback?.id === item.id ? feedback : null}
                  onApprove={() => handleApprove(item.id)}
                  onToggleVisibility={() => handleToggleVisibility(item)}
                  onDelete={() => handleDelete(item.id)}
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

function AdminSuggestionCard({
  item,
  busy,
  approved,
  feedback,
  onApprove,
  onToggleVisibility,
  onDelete,
}: {
  item: GameListRequestDto
  busy: boolean
  approved: boolean
  feedback: { msg: string; ok: boolean } | null
  onApprove: () => void
  onToggleVisibility: () => void
  onDelete: () => void
}) {
  return (
    <div className={`admin-ls-card ${item.hidden ? 'admin-ls-card--hidden' : ''}`}>
      <div className="admin-ls-card-main">
        <div className="admin-ls-card-info">
          <div className="admin-ls-card-top">
            {item.finalGameList ? (
              <Link to={`/list/${item.finalGameList.slug}`} className="admin-ls-list-link">
                {item.finalGameList.fullName}
              </Link>
            ) : (
              <span className="admin-ls-no-list">Sem lista associada</span>
            )}
            <div className="admin-ls-badges">
              {item.hidden && <span className="admin-ls-badge admin-ls-badge--hidden">Oculta</span>}
              {approved && <span className="admin-ls-badge admin-ls-badge--approved">Aprovada</span>}
            </div>
          </div>

          <a
            href={item.sourceListUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-ls-source"
          >
            {item.sourceName} · {item.sourceListUrl} ↗
          </a>

          <div className="admin-ls-games">
            {item.games.slice(0, 6).map(g => (
              <Link key={g.id} to={`/games/${g.gameId}`} className="admin-ls-game-chip">
                {g.position}. {g.gameTitle}
              </Link>
            ))}
            {item.games.length > 6 && (
              <span className="admin-ls-more">+{item.games.length - 6} mais</span>
            )}
          </div>

          <div className="admin-ls-meta">
            {item.userPosted ? (
              <Link to={`/users/${item.userPosted.nickname}`} className="admin-ls-user">
                @{item.userPosted.nickname}
              </Link>
            ) : (
              <span className="admin-ls-user">usuário desconhecido</span>
            )}
            <span className="admin-ls-sep">·</span>
            <span className="admin-ls-time">{timeAgo(item.dateAdded)}</span>
            <span className="admin-ls-sep">·</span>
            <span className="admin-ls-votes">▲ {item.likes} · ▼ {item.dislikes}</span>
          </div>

          {feedback && (
            <p className={`admin-ls-feedback ${feedback.ok ? 'ok' : 'err'}`}>
              {feedback.msg}
            </p>
          )}
        </div>

        <div className="admin-ls-actions">
          <button
            className="btn-approve"
            onClick={onApprove}
            disabled={busy || approved}
            title="Aprovar e criar a lista"
          >
            {busy ? '…' : approved ? '✓ Aprovada' : 'Aprovar'}
          </button>
          <button
            className="btn-visibility"
            onClick={onToggleVisibility}
            disabled={busy}
            title={item.hidden ? 'Tornar visível' : 'Ocultar'}
          >
            {item.hidden ? 'Mostrar' : 'Ocultar'}
          </button>
          <button
            className="btn-delete-sm"
            onClick={onDelete}
            disabled={busy}
            title="Deletar sugestão"
          >
            Deletar
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminSuggestionsSkeleton() {
  return (
    <div className="admin-ls-list">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="admin-ls-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
            <div className="skeleton" style={{ height: 30, width: 70, borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 30, width: 70, borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 30, width: 60, borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
