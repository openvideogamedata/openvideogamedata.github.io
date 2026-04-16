import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { login } from '../api/auth'
import {
  getListOptions, getListYearOptions, searchGames, materializeGameSearchResult, getApiErrorMessage,
  getUserListById, createUserList, updateUserList, deleteUserList,
} from '../api/userListForm'
import type { ListOptionDto, ListYearOptionDto, GameItemInput, GameSearchResult } from '../api/userListForm'
import './UserListForm.css'

export default function UserListForm() {
  const { id } = useParams<{ id: string }>()          // present when editing
  const [searchParams] = useSearchParams()
  const slugParam = searchParams.get('slug') ?? ''    // pre-select list
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const isEdit = Boolean(id)

  // Form state
  const [listOptions, setListOptions] = useState<ListOptionDto[]>([])
  const [yearOptions, setYearOptions] = useState<ListYearOptionDto[]>([])
  const [selectedTitle, setSelectedTitle] = useState('')
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [games, setGames] = useState<GameItemInput[]>([])

  // Game search
  const [gameQuery, setGameQuery] = useState('')
  const [gameResults, setGameResults] = useState<GameSearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRequestId = useRef(0)
  const addingRef = useRef<Set<number>>(new Set())

  // UI state
  const [loadingForm, setLoadingForm] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load list options + pre-populate if editing
  useEffect(() => {
    if (!user) return
    Promise.all([
      getListOptions(),
      isEdit ? getUserListById(Number(id)) : Promise.resolve(null),
    ]).then(([opts, existing]) => {
      setListOptions(opts)
      if (existing?.finalGameList) {
        setSelectedTitle(existing.finalGameList.title)
        setSelectedListId(existing.finalGameList.id)
        setGames(existing.items.map(it => ({
          position: it.position,
          gameTitle: it.gameTitle,
          gameId: it.gameId,
          firstReleaseDate: null,
        })))
      } else if (slugParam) {
        const match = opts.find(o => o.slug.toLowerCase() === slugParam.toLowerCase())
        if (match) {
          setSelectedTitle(match.title)
          setSelectedListId(match.id)
        }
      }
      setLoadingForm(false)
    }).catch(() => setLoadingForm(false))
  }, [user, id, isEdit, slugParam]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load year options when title changes
  useEffect(() => {
    if (!selectedTitle) { setYearOptions([]); setSelectedListId(null); return }
    getListYearOptions(selectedTitle).then(opts => {
      setYearOptions(opts)
      if (opts.length === 1) setSelectedListId(opts[0].id)
      else if (opts.length === 0) setSelectedListId(null)
    }).catch(() => {})
  }, [selectedTitle])

  // Game search debounce
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (!gameQuery.trim()) { setGameResults([]); return }
    searchDebounce.current = setTimeout(() => {
      const requestId = ++searchRequestId.current
      searchGames(gameQuery, slugParam || undefined)
        .then(res => {
          if (requestId === searchRequestId.current) setGameResults(res.games)
        })
        .catch(() => {})
    }, 350)
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current) }
  }, [gameQuery])

  async function addGame(game: GameSearchResult) {
    if (addingRef.current.has(game.externalId)) return
    if (game.id !== null && games.find(g => g.gameId === game.id)) return

    addingRef.current.add(game.externalId)
    try {
      const gameId = game.id ?? await materializeGameSearchResult(game)
      setGames(prev => {
        if (prev.find(g => g.gameId === gameId)) return prev
        return [...prev, { position: prev.length + 1, gameTitle: game.title, gameId, firstReleaseDate: null }]
      })
    } finally {
      addingRef.current.delete(game.externalId)
    }
    setGameQuery('')
    setGameResults([])
    setSearchOpen(false)
  }

  function removeGame(gameId: number) {
    setGames(prev => {
      const filtered = prev.filter(g => g.gameId !== gameId)
      return filtered.map((g, i) => ({ ...g, position: i + 1 }))
    })
  }

  function moveGame(index: number, dir: -1 | 1) {
    setGames(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((g, i) => ({ ...g, position: i + 1 }))
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedListId || games.length === 0) return
    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await updateUserList(Number(id), { finalGameListId: selectedListId, games })
      } else {
        await createUserList({ finalGameListId: selectedListId, games })
      }
      navigate(user ? `/users/${user.nickname}/lists` : '/')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save the list. Please try again.'))
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || !window.confirm('Delete this list permanently?')) return
    setDeleting(true)
    try {
      await deleteUserList(Number(id))
      navigate(user ? `/users/${user.nickname}/lists` : '/')
    } catch {
      setError('Could not delete the list.')
      setDeleting(false)
    }
  }

  if (authLoading || loadingForm) return <FormSkeleton />

  if (!user) {
    return (
      <div className="list-form-gate">
        <div className="gate-card">
          <h2>Sign in to create a list</h2>
          <p>You need an account to contribute lists.</p>
          <button className="btn-primary" onClick={() => login()}>Sign in with Google</button>
        </div>
      </div>
    )
  }

  const uniqueTitles = [...new Set(listOptions.map(o => o.title))].sort()
  const canSubmit = selectedListId !== null && games.length > 0 && !saving
  const addedGameIds = new Set(games.map(g => g.gameId))

  return (
    <div className="list-form-page">
      <section className="list-form-header">
        <div className="container">
          <h1 className="page-title">{isEdit ? 'Edit List' : 'Submit a List'}</h1>
          <p className="page-subtitle">
            {isEdit ? 'Update your submitted game ranking.' : 'Contribute your ranking to a master game list.'}
          </p>
        </div>
      </section>

      <div className="container list-form-body">
        <form className="list-form" onSubmit={handleSubmit}>
          {/* Step 1: Choose list */}
          <div className="form-section">
            <label className="form-label">1. Choose a list</label>
            <select
              className="form-select"
              value={selectedTitle}
              onChange={e => { setSelectedTitle(e.target.value); setSelectedListId(null) }}
            >
              <option value="">Select a list</option>
              {uniqueTitles.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Step 2: Choose year (if multiple) */}
          {yearOptions.length > 1 && (
            <div className="form-section">
              <label className="form-label">2. Choose edition / year</label>
              <div className="year-pills">
                {yearOptions.map(y => (
                  <button
                    key={y.id}
                    type="button"
                    className={`year-pill ${selectedListId === y.id ? 'active' : ''}`}
                    onClick={() => setSelectedListId(y.id)}
                  >
                    {y.year ?? 'All-time'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Add games */}
          <div className="form-section">
            <label className="form-label">{yearOptions.length > 1 ? '3' : '2'}. Add games</label>
            <div className="game-search-wrap">
              <input
                className="game-search-input"
                placeholder="Search a game to add..."
                value={gameQuery}
                onChange={e => { setGameQuery(e.target.value); setSearchOpen(true) }}
                onFocus={() => setSearchOpen(true)}
              />
              {searchOpen && gameResults.length > 0 && (
                <div className="game-results">
                  {gameResults.map(g => {
                    const isAdded = g.id !== null && addedGameIds.has(g.id)
                    return (
                      <button
                        key={g.externalId}
                        type="button"
                        className={`game-result-item${isAdded ? ' game-result-item--added' : ''}`}
                        onClick={() => addGame(g)}
                        disabled={isAdded}
                      >
                        {g.coverImageUrl && (
                          <img src={g.coverImageUrl} alt="" className="game-result-cover" />
                        )}
                        <span className="game-result-title">{g.title}</span>
                        <span className="game-result-year">{g.releaseYear}</span>
                        {isAdded && <span className="game-result-badge">Já adicionado</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {games.length > 0 && (
              <div className="games-list">
                {games.map((g, i) => (
                  <div key={g.gameId} className="game-row">
                    <span className="game-pos">#{g.position}</span>
                    <span className="game-title">{g.gameTitle}</span>
                    <div className="game-actions">
                      <button type="button" className="order-btn" onClick={() => moveGame(i, -1)} disabled={i === 0}>↑</button>
                      <button type="button" className="order-btn" onClick={() => moveGame(i, 1)} disabled={i === games.length - 1}>↓</button>
                      <button type="button" className="remove-btn" onClick={() => removeGame(g.gameId)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary form-submit" disabled={!canSubmit}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Submit list'}
            </button>
            {isEdit && (
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete list'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="list-form-page">
      <section className="list-form-header">
        <div className="container">
          <div className="skeleton" style={{ height: 36, width: 240, borderRadius: 6 }} />
        </div>
      </section>
      <div className="container list-form-body">
        <div className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 44, borderRadius: 8 }} />
      </div>
    </div>
  )
}
