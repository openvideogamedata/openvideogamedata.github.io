import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PixelArt from './PixelArt'
import { useAuth } from '../context/AuthContext'
import { login, logout } from '../api/auth'
import './Navbar.css'

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

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
          <Link to="/timeline" className="nav-link">Timeline</Link>
          <Link to="/badges" className="nav-link">Badges</Link>
          <Link to="/top-contributors" className="nav-link">Rankings</Link>
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
            <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Open search">
              <SearchIcon />
            </button>
          )}

          {!loading && (
            user ? (
              <div className="user-menu-wrap" ref={menuRef}>
                <button className="user-avatar-btn" onClick={() => setMenuOpen(v => !v)}>
                  {user.userPicture
                    ? <PixelArt matrix={user.userPicture} size={5} cellSize={4} className="nav-pixel-avatar" />
                    : <span className="nav-avatar-placeholder">{user.nickname?.[0]?.toUpperCase()}</span>
                  }
                </button>
                {menuOpen && (
                  <div className="user-menu">
                    <div className="user-menu-header">
                      <span className="user-menu-name">{user.fullName}</span>
                      <span className="user-menu-nick">@{user.nickname}</span>
                    </div>
                    <Link to={`/users/${user.nickname}`} className="user-menu-item" onClick={() => setMenuOpen(false)}>Profile</Link>
                    <Link to={`/users/${user.nickname}/trackers`} className="user-menu-item" onClick={() => setMenuOpen(false)}>Trackers</Link>
                    <Link to={`/users/${user.nickname}/lists`} className="user-menu-item" onClick={() => setMenuOpen(false)}>My Lists</Link>
                    <Link to="/friends" className="user-menu-item" onClick={() => setMenuOpen(false)}>
                      Friends
                      {user.hasNotifications && <span className="menu-badge" />}
                    </Link>
                    <Link to="/notifications" className="user-menu-item" onClick={() => setMenuOpen(false)}>
                      Notifications
                      {user.hasNotifications && <span className="menu-badge" />}
                    </Link>
                    <button className="user-menu-item user-menu-logout" onClick={logout}>Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn-primary-sm" onClick={() => login()}>Sign in</button>
            )
          )}
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
