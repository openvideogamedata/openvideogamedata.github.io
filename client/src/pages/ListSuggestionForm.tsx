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

const AI_PROMPT = `Extract the ranked list of games from the text above. Return ONLY the game titles in this exact format, one per line, with no extra text:

1. [Game Title]
2. [Game Title]
3. [Game Title]

Rules:
- Keep the original ranking order
- Include only the game titles — no descriptions, platforms, scores, or years
- If the list has more than 15 games, include only the top 15
- Do not write anything before or after the numbered list`

interface ParseResult {
  rawName: string
  match: GameSearchResult | null
  status: 'loading' | 'matched' | 'not-found'
  added: boolean
}

function extractGameNames(text: string): string[] {
  return text
    .split('\n')
    .map(line => {
      let s = line.trim()
      if (!s) return ''
      // strip leading numbering: "1.", "1)", "1-", "#1", "No. 1", bullets
      s = s.replace(/^(?:no\.?\s*)?\d+[\s.):–-]+/i, '')
      s = s.replace(/^[#•\-*]+\s*/, '')
      // strip trailing description after em/en dash
      s = s.replace(/\s[–—].*$/, '')
      // strip trailing parenthetical notes like "(2022)" or "(PS5)"
      s = s.replace(/\s*\([^)]{1,30}\)\s*$/, '')
      return s.trim()
    })
    .filter(s => s.length >= 2 && s.length <= 80)
}

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

  const [pasteText, setPasteText] = useState('')
  const [parseResults, setParseResults] = useState<ParseResult[]>([])
  const [parsing, setParsing] = useState(false)
  const [showPastePanel, setShowPastePanel] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

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

  function copyPrompt() {
    navigator.clipboard.writeText(AI_PROMPT).then(() => {
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
    })
  }

  async function handleParseText() {
    const names = extractGameNames(pasteText)
    if (!names.length) return

    const limited = names.slice(0, MAX_GAMES)
    setParseResults(limited.map(rawName => ({ rawName, match: null, status: 'loading', added: false })))
    setParsing(true)

    for (let i = 0; i < limited.length; i++) {
      try {
        const { games: found } = await searchGames(limited[i], slug)
        setParseResults(prev => {
          const next = [...prev]
          next[i] = { rawName: limited[i], match: found[0] ?? null, status: found.length > 0 ? 'matched' : 'not-found', added: false }
          return next
        })
      } catch {
        setParseResults(prev => {
          const next = [...prev]
          next[i] = { rawName: limited[i], match: null, status: 'not-found', added: false }
          return next
        })
      }
    }

    setParsing(false)
  }

  function dismissParseResult(idx: number) {
    setParseResults(prev => prev.filter((_, i) => i !== idx))
  }

  async function addFromParse(idx: number) {
    const result = parseResults[idx]
    if (!result?.match) return
    await addGame(result.match)
    setParseResults(prev => prev.map((r, i) => i === idx ? { ...r, added: true } : r))
  }

  async function addAllMatched() {
    for (let i = 0; i < parseResults.length; i++) {
      const r = parseResults[i]
      if (r.status !== 'matched' || r.added || !r.match) continue
      if (r.match.id != null && addedGameIds.has(r.match.id)) continue
      if (games.length >= MAX_GAMES) break
      await addFromParse(i)
    }
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

          {listIsValid && (
            <div className="form-section ai-prompt-section">
              <p className="ai-prompt-label">
                <strong>Use an AI to extract the list</strong>
              </p>
              <p className="helper-text helper-text-muted">
                Go to any AI (ChatGPT, Claude, Gemini…), paste the full text of the source page, then paste this prompt below it. The AI will return a clean numbered list ready for the next step.
              </p>
              <pre className="ai-prompt-box">{AI_PROMPT}</pre>
              <button
                type="button"
                className={`btn-copy-prompt${promptCopied ? ' btn-copy-prompt--copied' : ''}`}
                onClick={copyPrompt}
              >
                {promptCopied ? 'Copied!' : 'Copy prompt'}
              </button>
            </div>
          )}

          {listIsValid && (
            <div className="form-section">
              <button
                type="button"
                className="paste-panel-toggle"
                onClick={() => setShowPastePanel(v => !v)}
              >
                <span>Auto-detect games from pasted text</span>
                <span className="paste-panel-chevron">{showPastePanel ? '▲' : '▼'}</span>
              </button>

              {showPastePanel && (
                <div className="paste-panel-body">
                  <p className="helper-text helper-text-muted">
                    Paste the raw text of the list. The system will try to identify each game automatically.
                  </p>
                  <textarea
                    className="paste-textarea"
                    placeholder={"1. Elden Ring\n2. God of War Ragnarök\n3. The Last of Us Part I\n..."}
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    rows={7}
                    disabled={parsing}
                  />
                  <button
                    type="button"
                    className="btn-detect"
                    onClick={handleParseText}
                    disabled={!pasteText.trim() || parsing}
                  >
                    {parsing ? 'Detecting…' : 'Detect games'}
                  </button>

                  {parseResults.length > 0 && (
                    <div className="parse-results">
                      <p className="parse-results-summary">
                        {parseResults.filter(r => r.status === 'matched').length} of{' '}
                        {parseResults.filter(r => r.status !== 'loading').length} matched
                        {parsing && ' — searching…'}
                      </p>
                      {parseResults.map((result, i) => {
                        const alreadyInList = result.match?.id != null && addedGameIds.has(result.match.id)
                        const done = result.added || alreadyInList
                        return (
                          <div key={i} className={`parse-row parse-row--${done ? 'added' : result.status}`}>
                            <span className="parse-raw">{result.rawName}</span>
                            <div className="parse-match">
                              {result.status === 'loading' && <span className="parse-state">Searching…</span>}
                              {result.status === 'not-found' && <span className="parse-state parse-state--miss">No match</span>}
                              {result.status === 'matched' && result.match && (
                                <>
                                  {result.match.coverImageUrl && (
                                    <img src={result.match.coverImageUrl} alt="" className="parse-cover" />
                                  )}
                                  <span className="parse-game-title">{result.match.title}</span>
                                  <span className="parse-game-year">{result.match.releaseYear}</span>
                                </>
                              )}
                            </div>
                            <div className="parse-action">
                              {done && <span className="parse-badge parse-badge--ok">Added</span>}
                              {!done && result.status === 'matched' && (
                                <>
                                  <button
                                    type="button"
                                    className="parse-btn-add"
                                    onClick={() => addFromParse(i)}
                                    disabled={games.length >= MAX_GAMES}
                                  >
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    className="parse-btn-remove"
                                    onClick={() => dismissParseResult(i)}
                                    title="Remove this suggestion"
                                  >
                                    ×
                                  </button>
                                </>
                              )}
                              {!done && result.status === 'not-found' && (
                                <button
                                  type="button"
                                  className="parse-btn-remove"
                                  onClick={() => dismissParseResult(i)}
                                  title="Dismiss"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {!parsing && parseResults.some(r => {
                        if (r.status !== 'matched' || r.added || !r.match) return false
                        return r.match.id == null || !addedGameIds.has(r.match.id)
                      }) && (
                        <button
                          type="button"
                          className="btn-detect btn-detect--secondary"
                          onClick={addAllMatched}
                          disabled={games.length >= MAX_GAMES}
                        >
                          Add all matched
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
