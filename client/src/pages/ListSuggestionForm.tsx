import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getListBySlug } from '../api/gameLists'
import { createListSuggestion, validateSourceUrl } from '../api/listSuggestions'
import { getApiErrorMessage, materializeGameSearchResult, searchGames } from '../api/userListForm'
import LoginButton from '../components/LoginButton'
import { useAuth } from '../context/AuthContext'
import type { GameItemInput, GameSearchResult } from '../api/userListForm'
import './ListSuggestionForm.css'

const MAX_GAMES = 15

export default function ListSuggestionForm() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [listId, setListId] = useState<number | null>(null)
  const [listFullName, setListFullName] = useState('')
  const [loadingPage, setLoadingPage] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [sourceListUrl, setSourceListUrl] = useState('')
  const [validationMessage, setValidationMessage] = useState('Enter a list to continue')
  const [listIsValid, setListIsValid] = useState(false)
  const [validatingUrl, setValidatingUrl] = useState(false)

  const [gameQuery, setGameQuery] = useState('')
  const [gameResults, setGameResults] = useState<GameSearchResult[]>([])
  const [games, setGames] = useState<GameItemInput[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchingGame, setSearchingGame] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const validationRequestId = useRef(0)
  const searchRequestId = useRef(0)
  const addingRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!slug) {
      setNotFound(true)
      setLoadingPage(false)
      return
    }

    setNotFound(false)
    setLoadingPage(true)
    getListBySlug(slug)
      .then((res) => {
        setListId(res.finalGameList.id)
        setListFullName(res.finalGameList.fullName)
        setLoadingPage(false)
      })
      .catch(() => {
        setNotFound(true)
        setLoadingPage(false)
      })
  }, [slug])

  useEffect(() => {
    if (validationDebounce.current) clearTimeout(validationDebounce.current)

    const nextUrl = sourceListUrl.trim()
    if (!nextUrl) {
      setValidatingUrl(false)
      setValidationMessage('Enter a list to continue')
      setListIsValid(false)
      return
    }

    setValidatingUrl(true)
    validationDebounce.current = setTimeout(() => {
      const requestId = ++validationRequestId.current
      validateSourceUrl(nextUrl)
        .then((res) => {
          if (requestId !== validationRequestId.current) return
          setValidationMessage(res.reason)
          setListIsValid(res.success)
        })
        .catch(() => {
          if (requestId !== validationRequestId.current) return
          setValidationMessage('Could not validate this URL right now.')
          setListIsValid(false)
        })
        .finally(() => {
          if (requestId === validationRequestId.current) setValidatingUrl(false)
        })
    }, 350)

    return () => {
      if (validationDebounce.current) clearTimeout(validationDebounce.current)
    }
  }, [sourceListUrl])

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (!gameQuery.trim()) {
      setGameResults([])
      setSearchingGame(false)
      return
    }

    setSearchingGame(true)
    searchDebounce.current = setTimeout(() => {
      const requestId = ++searchRequestId.current
      searchGames(gameQuery, slug)
        .then((res) => {
          if (requestId === searchRequestId.current) setGameResults(res.games)
        })
        .catch(() => {
          if (requestId === searchRequestId.current) setGameResults([])
        })
        .finally(() => {
          if (requestId === searchRequestId.current) setSearchingGame(false)
        })
    }, 350)

    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current)
    }
  }, [gameQuery])

  async function addGame(game: GameSearchResult) {
    if (addingRef.current.has(game.externalId)) return
    if (game.id !== null && games.find((g) => g.gameId === game.id)) return

    addingRef.current.add(game.externalId)
    try {
      const gameId = game.id ?? await materializeGameSearchResult(game)
      setGames((prev) => {
        if (prev.length >= MAX_GAMES) return prev
        if (prev.find((g) => g.gameId === gameId)) return prev
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
    setGames((prev) => prev
      .filter((g) => g.gameId !== gameId)
      .map((g, index) => ({ ...g, position: index + 1 })))
  }

  function moveGame(index: number, direction: -1 | 1) {
    setGames((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next.map((g, i) => ({ ...g, position: i + 1 }))
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !listId || !listIsValid || games.length === 0) return

    setSaving(true)
    setError(null)
    try {
      await createListSuggestion({
        sourceListUrl: sourceListUrl.trim(),
        finalGameListId: listId,
        games: games.map((game, index) => ({
          position: index + 1,
          gameTitle: game.gameTitle,
          gameId: game.gameId,
          firstReleaseDate: game.firstReleaseDate,
        })),
      })
      navigate('/list-suggestions')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not submit the list suggestion. Please try again.'))
      setSaving(false)
    }
  }

  if (authLoading || loadingPage) return <SuggestionSkeleton />

  if (notFound || !listId) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>List not found</h2>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="list-suggestion-gate">
        <div className="gate-card">
          <h2>Sign in to suggest a source list</h2>
          <p>You need an account to submit a list that can be used in the master ranking.</p>
          <LoginButton text="Sign in with Google" />
        </div>
      </div>
    )
  }

  const canSubmit = listIsValid && games.length > 0 && !saving
  const addedGameIds = new Set(games.map((g) => g.gameId))

  return (
    <div className="list-suggestion-page">
      <section className="list-suggestion-header">
        <div className="container">
          <h1 className="page-title">Add new list for "{listFullName}"</h1>
          <p className="page-subtitle">This is for transcribing an existing ranked source, not your personal opinion.</p>
        </div>
      </section>

      <div className="container list-suggestion-body">
        <form className="list-suggestion-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <label className="form-label"><strong>Enter the URL of the list you want to add</strong></label>
            <input
              className="form-input"
              value={sourceListUrl}
              onChange={(e) => setSourceListUrl(e.target.value)}
              disabled={listIsValid}
              placeholder="https://example.com/best-games-ever"
              inputMode="url"
            />
            <div className={`validation-banner ${listIsValid ? 'success' : 'warning'}`}>
              <span>{listIsValid ? 'OK' : 'Warning'}</span>
              <p>{validatingUrl ? 'Validating URL...' : validationMessage}</p>
            </div>
          </div>

          {!listIsValid && (
            <div className="form-section rules-card">
              <h2>Rules</h2>
              <ul>
                <li>Accurately transcribe the games from the original source.</li>
                <li>Must be enumerated and ranked.</li>
                <li>Should not change daily and not be based in another list.</li>
              </ul>
              <p>
                Example list:{' '}
                <a href="https://www.ign.com/articles/the-best-100-video-games-of-all-time" target="_blank" rel="noopener noreferrer">
                  https://www.ign.com/articles/the-best-100-video-games-of-all-time
                </a>
              </p>
            </div>
          )}

          {listIsValid && (
            <div className="form-section">
              <label className="form-label">Games to add ({games.length}/{MAX_GAMES})</label>
              <p className="helper-text">
                For lists with more than {MAX_GAMES}, add only the top {MAX_GAMES} games; otherwise, add all items of the list.
              </p>
              <p className="helper-text helper-text-muted">
                If the list has only 10 items, add 10. If it has 20, add at least the top 15.
              </p>

              <div className="game-search-wrap">
                <input
                  className="game-search-input"
                  placeholder="Search a game to add..."
                  value={gameQuery}
                  onChange={(e) => { setGameQuery(e.target.value); setSearchOpen(true) }}
                  onFocus={() => setSearchOpen(true)}
                  disabled={games.length >= MAX_GAMES}
                />
                {searchOpen && (searchingGame || gameResults.length > 0) && (
                  <div className="game-results">
                    {searchingGame && <div className="game-result-empty">Searching...</div>}
                    {!searchingGame && gameResults.map((g) => {
                      const isAdded = g.id !== null && addedGameIds.has(g.id)
                      return (
                        <button
                          key={g.externalId}
                          type="button"
                          className={`game-result-item${isAdded ? ' game-result-item--added' : ''}`}
                          onClick={() => addGame(g)}
                          disabled={isAdded}
                        >
                          {g.coverImageUrl && <img src={g.coverImageUrl} alt="" className="game-result-cover" />}
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
                  {games.map((game, index) => (
                    <div key={game.gameId} className="game-row">
                      <span className="game-pos">#{game.position}</span>
                      <span className="game-title">{game.gameTitle}</span>
                      <div className="game-actions">
                        <button type="button" className="order-btn" onClick={() => moveGame(index, -1)} disabled={index === 0}>↑</button>
                        <button type="button" className="order-btn" onClick={() => moveGame(index, 1)} disabled={index === games.length - 1}>↓</button>
                        <button type="button" className="remove-btn" onClick={() => removeGame(game.gameId)}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary form-submit" disabled={!canSubmit}>
              {saving ? 'Submitting...' : 'Create new list suggestion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SuggestionSkeleton() {
  return (
    <div className="list-suggestion-page">
      <section className="list-suggestion-header">
        <div className="container">
          <div className="skeleton" style={{ height: 36, width: 320, borderRadius: 6 }} />
        </div>
      </section>
      <div className="container list-suggestion-body">
        <div className="skeleton" style={{ height: 44, borderRadius: 8, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
      </div>
    </div>
  )
}
