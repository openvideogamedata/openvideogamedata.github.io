import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PixelArt from './PixelArt'
import { useAuth } from '../context/AuthContext'
import { logout } from '../api/auth'
import LoginButton from './LoginButton'
import './Navbar.css'

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [desktopProfileOpen, setDesktopProfileOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileNavRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, loading, isAdmin, refresh } = useAuth()

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setDesktopProfileOpen(false)
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) {
        setMobileNavOpen(false)
        setMobileProfileOpen(false)
      }
    }
    if (menuOpen || mobileNavOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen, mobileNavOpen])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setSearchOpen(false)
      setQuery('')
    }
  }

  function handleLogout() {
    logout()
    refresh()
    setMenuOpen(false)
    setDesktopProfileOpen(false)
    setMobileNavOpen(false)
    setMobileProfileOpen(false)
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo">
          <span className="logo-text">
            Open<span className="logo-accent">VGD</span>
          </span>
        </Link>

        <nav className="navbar-links">
          <Link to="/lists" className="nav-link">Lists</Link>
          <Link to="/games" className="nav-link">Games</Link>
          <Link to="/badges" className="nav-link">Badges</Link>
          <Link to="/top-contributors" className="nav-link">Rankings</Link>
        </nav>

        <div className="navbar-actions">
          <div className="mobile-nav-wrap" ref={mobileNavRef}>
            <button
              className="icon-btn mobile-nav-toggle"
              onClick={() => {
                setMobileNavOpen(v => {
                  const next = !v
                  if (!next) setMobileProfileOpen(false)
                  return next
                })
              }}
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
            >
              <MenuIcon />
            </button>
            {mobileNavOpen && (
              <div className="mobile-nav-menu">
                <form className="mobile-search-form" onSubmit={handleSearch}>
                  <input
                    className="mobile-search-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search games, lists..."
                  />
                  <button
                    type="submit"
                    className="mobile-search-btn"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Search
                  </button>
                </form>
                <Link to="/lists" className="mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Lists</Link>
                <Link to="/games" className="mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Games</Link>
                <Link to="/top-contributors" className="mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Rankings</Link>
                {!loading && (
                  user ? (
                    <>
                      <div className="mobile-nav-divider" />
                      <button
                        className="mobile-nav-link mobile-nav-link-toggle"
                        onClick={() => setMobileProfileOpen(v => !v)}
                        aria-expanded={mobileProfileOpen}
                      >
                        <span>Profile</span>
                        <span className={`mobile-nav-chevron ${mobileProfileOpen ? 'open' : ''}`}><ChevronIcon /></span>
                      </button>
                      {mobileProfileOpen && (
                        <div className="mobile-submenu">
                          <Link to={`/users/${user.nickname}`} className="mobile-submenu-link" onClick={() => setMobileNavOpen(false)}>Overview</Link>
                          <Link to="/badges" className="mobile-submenu-link" onClick={() => setMobileNavOpen(false)}>Badges</Link>
                          <Link to={`/users/${user.nickname}/lists`} className="mobile-submenu-link" onClick={() => setMobileNavOpen(false)}>My Lists</Link>
                          <Link to="/notifications" className="mobile-submenu-link" onClick={() => setMobileNavOpen(false)}>
                            Notifications
                            {user.hasNotifications && <span className="menu-badge" />}
                          </Link>
                          <Link to="/friends" className="mobile-submenu-link" onClick={() => setMobileNavOpen(false)}>
                            Friends
                            {user.hasNotifications && <span className="menu-badge" />}
                          </Link>
                        </div>
                      )}
                      <Link to={`/users/${user.nickname}/trackers`} className="mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Trackers</Link>
                      <Link to="/timeline" className="mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Timeline</Link>
                      {isAdmin && (
                        <>
                          <Link to="/admin/users" className="mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Admin: Users</Link>
                          <Link to="/admin/lists/new" className="mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Admin: New List</Link>
                          <Link to="/admin/list-suggestions" className="mobile-nav-link" onClick={() => setMobileNavOpen(false)}>Admin: Suggestions</Link>
                        </>
                      )}
                      <button
                        className="mobile-nav-button mobile-nav-button-danger"
                        onClick={() => {
                          handleLogout()
                        }}
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mobile-nav-divider" />
                      <LoginButton onSuccess={() => setMobileNavOpen(false)} text="Sign in" />
                    </>
                  )
                )}
              </div>
            )}
          </div>
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
                    ? <PixelArt matrix={user.userPicture} cellSize={3} className="nav-pixel-avatar" />
                    : <span className="nav-avatar-placeholder">{user.nickname?.[0]?.toUpperCase()}</span>
                  }
                </button>
                {menuOpen && (
                  <div className="user-menu">
                    <div className="user-menu-header">
                      <span className="user-menu-name">{user.fullName}</span>
                      <span className="user-menu-nick">@{user.nickname}</span>
                    </div>
                    <button
                      className="user-menu-item user-menu-toggle"
                      onClick={() => setDesktopProfileOpen(v => !v)}
                      aria-expanded={desktopProfileOpen}
                    >
                      <span>Profile</span>
                      <span className={`user-menu-chevron ${desktopProfileOpen ? 'open' : ''}`}><ChevronIcon /></span>
                    </button>
                    {desktopProfileOpen && (
                      <div className="user-menu-submenu">
                        <Link to={`/users/${user.nickname}`} className="user-menu-subitem" onClick={() => setMenuOpen(false)}>Overview</Link>
                        <Link to="/badges" className="user-menu-subitem" onClick={() => setMenuOpen(false)}>Badges</Link>
                        <Link to={`/users/${user.nickname}/lists`} className="user-menu-subitem" onClick={() => setMenuOpen(false)}>My Lists</Link>
                        <Link to="/notifications" className="user-menu-subitem" onClick={() => setMenuOpen(false)}>
                          Notifications
                          {user.hasNotifications && <span className="menu-badge" />}
                        </Link>
                        <Link to="/friends" className="user-menu-subitem" onClick={() => setMenuOpen(false)}>
                          Friends
                          {user.hasNotifications && <span className="menu-badge" />}
                        </Link>
                      </div>
                    )}
                    <Link to={`/users/${user.nickname}/trackers`} className="user-menu-item" onClick={() => setMenuOpen(false)}>Trackers</Link>
                    <Link to="/timeline" className="user-menu-item" onClick={() => setMenuOpen(false)}>Timeline</Link>
                    {isAdmin && (
                      <>
                        <Link to="/admin/users" className="user-menu-item user-menu-admin" onClick={() => setMenuOpen(false)}>Admin: Users</Link>
                        <Link to="/admin/lists/new" className="user-menu-item user-menu-admin" onClick={() => setMenuOpen(false)}>Admin: New List</Link>
                        <Link to="/admin/list-suggestions" className="user-menu-item user-menu-admin" onClick={() => setMenuOpen(false)}>Admin: Suggestions</Link>
                      </>
                    )}
                    <button className="user-menu-item user-menu-logout" onClick={handleLogout}>Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <LoginButton text="Sign in" />
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

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 5l4 4 4-4" />
    </svg>
  )
}
