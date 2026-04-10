import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Paginator from '../components/Paginator'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import type { Pager } from '../types'
import './AdminUsers.css'

interface UserAdminDto {
  id: number
  nameIdentifier: string
  givenName: string
  surname: string
  nickname: string
  fullName: string
  role: string | null
  banned: boolean
  banReason: string | null
  contributions: number
}

interface AdminUsersResponse {
  users: UserAdminDto[]
  pager: Pager
}

export default function AdminUsers() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserAdminDto[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [stats, setStats] = useState<{ totalGameLists: number; totalUsers: number } | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const fetchUsers = useCallback((page: number, q: string) => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page), pageSize: '10' })
    if (q) qs.set('search', q)
    api.get<AdminUsersResponse>(`/api/admin/users?${qs}`)
      .then(res => { setUsers(res.users); setPager(res.pager) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchUsers(1, '')
      api.get<{ totalGameLists: number; totalUsers: number }>('/api/admin/stats')
        .then(setStats).catch(() => {})
    }
  }, [authLoading, isAdmin, fetchUsers])

  async function handleToggleBan(user: UserAdminDto) {
    setTogglingId(user.nameIdentifier)
    try {
      await api.put(`/api/admin/users/${encodeURIComponent(user.nameIdentifier)}/ban`, {
        banned: !user.banned,
      })
      fetchUsers(pager?.currentPage ?? 1, search)
    } catch {
      alert('Failed to toggle ban.')
    } finally {
      setTogglingId(null)
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

  return (
    <div className="admin-users-page">
      <section className="admin-header">
        <div className="container">
          <div className="admin-breadcrumb">Admin</div>
          <h1 className="page-title">Users</h1>
        </div>
      </section>

      <div className="container admin-body">
        {stats && (
          <div className="admin-stats-row">
            <span className="admin-stat-chip">{stats.totalGameLists} lists</span>
            <span className="admin-stat-chip">{stats.totalUsers} users</span>
            <button
              className="admin-stat-chip admin-regen-btn"
              disabled={regenerating}
              onClick={async () => {
                setRegenerating(true)
                await api.post('/api/admin/top-winners/regenerate', {}).catch(() => {})
                setRegenerating(false)
              }}
            >
              {regenerating ? 'Regenerating…' : '↻ Regenerate Top Winners'}
            </button>
          </div>
        )}
        <div className="admin-toolbar">
          <form className="admin-search-form" onSubmit={e => {
            e.preventDefault()
            setSearch(searchInput)
            fetchUsers(1, searchInput)
          }}>
            <input
              className="admin-search-input"
              placeholder="Search by name or nickname…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn-primary-sm">Search</button>
          </form>
          <Link to="/admin/lists/new" className="btn-primary-sm">+ New Master List</Link>
        </div>

        {loading ? (
          <AdminSkeleton />
        ) : (
          <>
            <div className="admin-table">
              <div className="admin-table-head">
                <span>User</span>
                <span>Nickname</span>
                <span>Role</span>
                <span>Lists</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {users.map(u => (
                <div key={u.id} className={`admin-table-row ${u.banned ? 'banned-row' : ''}`}>
                  <span
                    className="admin-user-name"
                    onClick={() => navigate(`/users/${u.nickname}`)}
                    role="button"
                  >
                    {u.fullName}
                  </span>
                  <span className="admin-nick">@{u.nickname}</span>
                  <span className="admin-role">{u.role ?? '—'}</span>
                  <span>{u.contributions}</span>
                  <span className={u.banned ? 'status-banned' : 'status-active'}>
                    {u.banned ? 'Banned' : 'Active'}
                  </span>
                  <button
                    className={u.banned ? 'btn-unban' : 'btn-ban'}
                    onClick={() => handleToggleBan(u)}
                    disabled={togglingId === u.nameIdentifier}
                  >
                    {togglingId === u.nameIdentifier ? '…' : u.banned ? 'Unban' : 'Ban'}
                  </button>
                </div>
              ))}
            </div>
            {pager && <Paginator pager={pager} onPageChange={p => fetchUsers(p, search)} />}
          </>
        )}
      </div>
    </div>
  )
}

function AdminSkeleton() {
  return (
    <div className="admin-table">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="admin-table-row">
          <div className="skeleton" style={{ height: 14, width: 140, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 14, width: 90, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 14, width: 60, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 14, width: 30, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 14, width: 50, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 28, width: 60, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  )
}
