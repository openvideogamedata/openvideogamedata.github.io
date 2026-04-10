import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import GameCard from '../components/GameCard'
import { getGames } from '../api/games'
import { getTimeline } from '../api/timeline'
import type { GameSummary, TimelineGeneration } from '../types'
import './Home.css'

export default function Home() {
  const [query, setQuery] = useState('')
  const [games, setGames] = useState<GameSummary[]>([])
  const [timeline, setTimeline] = useState<TimelineGeneration[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const heroInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      getGames({ pageSize: 18, order: 0 }).catch(() => ({ games: [] as GameSummary[], pager: null })),
      getTimeline().catch(() => [] as TimelineGeneration[]),
    ]).then(([gamesRes, timelineRes]) => {
      setGames(gamesRes.games)
      setTimeline(timelineRes)
      setLoading(false)
    })
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const latestGeneration = timeline[timeline.length - 1]

  return (
    <div className="home">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="container hero-content">
          <div className="hero-badge">Community-curated database</div>
          <h1 className="hero-title">
            The open archive of
            <br />
            <span className="hero-title-accent">video game history</span>
          </h1>
          <p className="hero-subtitle">
            Discover, track, and explore games across every generation.
            <br />
            Built by players, for players.
          </p>

          <form className="hero-search" onSubmit={handleSearch}>
            <div className="hero-search-wrap">
              <span className="hero-search-icon">
                <SearchIcon />
              </span>
              <input
                ref={heroInputRef}
                className="hero-search-input"
                placeholder="Search games, lists, or users…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className="hero-search-clear"
                  onClick={() => { setQuery(''); heroInputRef.current?.focus() }}
                  aria-label="Clear"
                >×</button>
              )}
            </div>
            <button type="submit" className="hero-search-btn">Search</button>
          </form>

          <div className="hero-cta-links">
            <Link to="/games" className="hero-link">Browse all games →</Link>
            <Link to="/timeline" className="hero-link">Explore by generation →</Link>
          </div>
        </div>
      </section>

      {/* ── Featured Games ────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Top Cited Games</h2>
              <p className="section-subtitle">Most referenced across community lists</p>
            </div>
            <Link to="/games" className="see-all-link">See all →</Link>
          </div>

          {loading ? (
            <div className="games-grid">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="game-card-skeleton">
                  <div className="skeleton cover-skeleton" />
                  <div className="skeleton title-skeleton" />
                  <div className="skeleton meta-skeleton" />
                </div>
              ))}
            </div>
          ) : games.length > 0 ? (
            <div className="games-grid">
              {games.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <EmptyState
              message="Could not load games"
              hint="Check your connection or try again later"
            />
          )}
        </div>
      </section>

      {/* ── Timeline Teaser ───────────────────────────────────── */}
      {latestGeneration && (
        <section className="section timeline-section">
          <div className="container">
            <div className="section-header">
              <div>
                <h2 className="section-title">Browse by Generation</h2>
                <p className="section-subtitle">
                  {timeline.length} console generations documented
                </p>
              </div>
              <Link to="/timeline" className="see-all-link">Full timeline →</Link>
            </div>

            <div className="generations-grid">
              {timeline.slice(-6).reverse().map(gen => (
                <Link
                  key={gen.generation}
                  to={`/timeline?gen=${gen.generation}`}
                  className="generation-card"
                >
                  <div className="gen-number">Gen {gen.generation}</div>
                  <div className="gen-name">{gen.name}</div>
                  <div className="gen-lists">
                    {gen.lists.length} {gen.lists.length === 1 ? 'list' : 'lists'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Features / About strip ─────────────────────────────── */}
      <section className="section features-section">
        <div className="container">
          <div className="features-grid">
            <Feature
              icon="◈"
              title="Aggregated rankings"
              desc="We pull from hundreds of critic and community lists to build a consensus score for every game."
            />
            <Feature
              icon="⊹"
              title="Track your library"
              desc="Log completed games, set statuses, write notes, and earn badges as you play."
            />
            <Feature
              icon="⌾"
              title="Explore every era"
              desc="From Pong to the PS5 — browse games by console generation, year, or platform."
            />
            <Feature
              icon="◎"
              title="Open & community-driven"
              desc="No ads, no paywall. Data contributed by players, maintained in the open."
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="feature-card">
      <span className="feature-icon">{icon}</span>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{desc}</p>
    </div>
  )
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="empty-state">
      <p className="empty-message">{message}</p>
      <p className="empty-hint">{hint}</p>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
