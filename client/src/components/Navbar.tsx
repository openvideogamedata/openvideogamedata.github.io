import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setSearchOpen(false)
      setQuery('')
    }
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">
            Open<span className="logo-accent">VGD</span>
          </span>
        </Link>

        <nav className="navbar-links">
          <Link to="/games" className="nav-link">Games</Link>
          <Link to="/lists" className="nav-link">Lists</Link>
          <Link to="/timeline" className="nav-link">Timeline</Link>
        </nav>

        <div className="navbar-actions">
          {searchOpen ? (
            <form className="navbar-search-form" onSubmit={handleSearch}>
              <input
                ref={inputRef}
                className="navbar-search-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search games, lists…"
                onBlur={() => { if (!query) setSearchOpen(false) }}
              />
              <button type="submit" className="search-submit-btn" aria-label="Search">
                <SearchIcon />
              </button>
            </form>
          ) : (
            <button
              className="icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
            >
              <SearchIcon />
            </button>
          )}
          <Link to="/login" className="btn-primary-sm">Sign in</Link>
        </div>
      </div>
    </header>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
