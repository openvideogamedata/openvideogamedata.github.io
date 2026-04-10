import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import PixelArt from '../components/PixelArt'
import Paginator from '../components/Paginator'
import { useAuth } from '../context/AuthContext'
import { login } from '../api/auth'
import { api } from '../api/client'
import type { Pager } from '../types'
import './UsersSearch.css'

interface UserSummaryDto {
  id: number
  nickname: string
  fullName: string
  userPicture: string[] | null
  contributions: number
}

interface UsersResponse {
  users: UserSummaryDto[]
  pager: Pager
}

export default function UsersSearch() {
  const { user, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<UserSummaryDto[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchUsers = useCallback((page: number, q: string) => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page), pageSize: '10' })
    if (q) qs.set('search', q)
    api.get<UsersResponse>(`/api/users?${qs}`)
      .then(res => { setUsers(res.users); setPager(res.pager) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (user) fetchUsers(1, '')
  }, [user, fetchUsers])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    fetchUsers(1, searchInput)
  }

  if (authLoading) return null

  if (!user) {
    return (
      <div className="users-search-gate">
        <div className="gate-card">
          <h2>Sign in to search users</h2>
          <p>This page is only available to authenticated users.</p>
          <button className="btn-primary" onClick={() => login()}>Sign in with Google</button>
        </div>
      </div>
    )
  }

  return (
    <div className="users-search-page">
      <section className="users-search-header">
        <div className="container">
          <h1 className="page-title">Find Users</h1>
          <p className="page-subtitle">Search for players and add them as friends.</p>
        </div>
      </section>

      <div className="container users-search-body">
        <form className="users-search-form" onSubmit={handleSearch}>
          <input
            className="users-search-input"
            placeholder="Search by name or nickname…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-primary-sm">Search</button>
        </form>

        {loading ? (
          <UsersSkeleton />
        ) : users.length === 0 ? (
          <p className="empty-state">{search ? 'No users found.' : 'Start searching to find players.'}</p>
        ) : (
          <>
            <div className="users-list">
              {users.map(u => (
                <Link key={u.id} to={`/users/${u.nickname}`} className="user-row">
                  <div className="user-row-avatar">
                    {u.userPicture
                      ? <PixelArt matrix={u.userPicture} size={5} cellSize={6} />
                      : <div className="avatar-ph" />
                    }
                  </div>
                  <div className="user-row-info">
                    <span className="user-row-name">{u.fullName}</span>
                    <span className="user-row-nick">@{u.nickname}</span>
                  </div>
                  <span className="user-row-contributions">{u.contributions} lists</span>
                </Link>
              ))}
            </div>
            {pager && <Paginator pager={pager} onPageChange={p => fetchUsers(p, search)} />}
          </>
        )}
      </div>
    </div>
  )
}

function UsersSkeleton() {
  return (
    <div className="users-list" style={{ marginTop: '1rem' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="user-row" style={{ pointerEvents: 'none' }}>
          <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 6 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 14, width: 140, marginBottom: 5, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 11, width: 90, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
