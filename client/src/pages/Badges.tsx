import { useState, useEffect } from 'react'
import { getBadges, createBadge, updateBadge, assignBadge, unassignBadge, updateBadgePixelArt } from '../api/badges'
import type { BadgeDto, BadgesResponse } from '../api/badges'
import PixelArt from '../components/PixelArt'
import PixelEditor from '../components/PixelEditor'
import TabBar from '../components/TabBar'
import './Badges.css'

const EMPTY_MATRIX = Array(64).fill(' ')

export default function Badges() {
  const [data, setData] = useState<BadgesResponse | null>(null)
  const [loading, setLoading] = useState(true)

  function reload() {
    setLoading(true)
    getBadges()
      .then(res => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { reload() }, [])

  const userBadgeIds = new Set(data?.userBadges.map(b => b.id) ?? [])
  const sorted = [...(data?.badges ?? [])].sort((a, b) => a.priority - b.priority)

  return (
    <div className="badges-page">
      <section className="badges-header">
        <div className="container">
          <h1 className="page-title">Badges</h1>
          <p className="page-subtitle">
            Earn badges by contributing to the community, tracking games, and more.
          </p>
          {data && data.userBadges.length > 0 && (
            <p className="badges-earned">
              You've earned <strong>{data.userBadges.length}</strong> of{' '}
              <strong>{data.badges.length}</strong> badges.
            </p>
          )}
        </div>
      </section>

      <div className="container badges-body">
        {loading ? (
          <BadgesSkeleton />
        ) : (
          <div className="badges-grid">
            {sorted.map(badge => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                earned={userBadgeIds.has(badge.id)}
                isAdmin={data?.isAdmin ?? false}
                onPixelArtSaved={reload}
              />
            ))}
          </div>
        )}

        {data?.isAdmin && (
          <AdminBadgesPanel allBadges={data.badges} onDone={reload} />
        )}
      </div>
    </div>
  )
}

function BadgeCard({ badge, earned, isAdmin, onPixelArtSaved }: {
  badge: BadgeDto
  earned: boolean
  isAdmin: boolean
  onPixelArtSaved: () => void
}) {
  const [editingArt, setEditingArt] = useState(false)
  const [draft, setDraft] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function startEdit() {
    const filled = [...(badge.pixelArt ?? [])].concat(EMPTY_MATRIX).slice(0, 64)
    setDraft(filled)
    setEditingArt(true)
  }

  async function saveArt() {
    setSaving(true)
    try {
      await updateBadgePixelArt(badge.id, draft)
      onPixelArtSaved()
      setEditingArt(false)
    } catch { /* silent */ }
    setSaving(false)
  }

  return (
    <div className={`badge-card ${earned ? 'earned' : 'locked'}`}>
      <div className="badge-art">
        {editingArt ? (
          <div className="badge-art-editor">
            <PixelEditor matrix={draft} gridSize={8} cellSize={14} onChange={setDraft} />
            <div className="badge-art-editor-actions">
              <button className="btn-primary-sm" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={saveArt} disabled={saving}>
                {saving ? '…' : 'Save'}
              </button>
              <button className="btn-outline-sm" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }} onClick={() => setEditingArt(false)}>×</button>
            </div>
          </div>
        ) : (
          <>
            {badge.pixelArt ? (
              <PixelArt matrix={badge.pixelArt} cellSize={6} className={earned ? '' : 'badge-art-locked'} />
            ) : (
              <div className="badge-art-placeholder" />
            )}
            {earned && <span className="badge-earned-dot" title="Earned" />}
            {isAdmin && (
              <button className="badge-edit-art-btn" onClick={startEdit} title="Edit pixel art">✏</button>
            )}
          </>
        )}
      </div>
      <div className="badge-info">
        <span className="badge-name">{badge.name}</span>
        <span className="badge-desc">{badge.description}</span>
      </div>
    </div>
  )
}

// ── Admin panel ──────────────────────────────────────────────────────────────

function AdminBadgesPanel({ allBadges, onDone }: { allBadges: BadgeDto[]; onDone: () => void }) {
  const [tab, setTab] = useState<'add' | 'update' | 'bind'>('add')

  return (
    <div className="admin-badges-panel">
      <hr className="admin-badges-divider" />
      <h2 className="admin-badges-title">Admin: Badges</h2>
      <TabBar
        tabs={[
          { key: 'add',    label: 'Add' },
          { key: 'update', label: 'Update' },
          { key: 'bind',   label: 'Bind' },
        ]}
        active={tab}
        onChange={v => setTab(v as typeof tab)}
      />
      {tab === 'add'    && <AddBadgeForm onDone={onDone} />}
      {tab === 'update' && <UpdateBadgeForm allBadges={allBadges} onDone={onDone} />}
      {tab === 'bind'   && <BindBadgeForm allBadges={allBadges} />}
    </div>
  )
}

function AddBadgeForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [autoGiven, setAutoGiven] = useState(false)
  const [priority, setPriority] = useState(0)
  const [matrix, setMatrix] = useState<string[]>([...EMPTY_MATRIX])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !desc) { setError('Name and description required.'); return }
    setSaving(true); setError('')
    try {
      await createBadge({ name, description: desc, pixelArt: JSON.stringify(matrix), automaticallyGiven: autoGiven, priority })
      onDone()
      setName(''); setDesc(''); setAutoGiven(false); setPriority(0); setMatrix([...EMPTY_MATRIX])
    } catch { setError('Failed to create badge.') }
    setSaving(false)
  }

  return (
    <form className="admin-badge-form" onSubmit={handleSubmit}>
      <BadgeFormFields name={name} setName={setName} desc={desc} setDesc={setDesc}
        autoGiven={autoGiven} setAutoGiven={setAutoGiven} priority={priority} setPriority={setPriority} />
      <label className="admin-form-label">Pixel Art</label>
      <PixelEditor matrix={matrix} gridSize={8} cellSize={20} onChange={setMatrix} />
      {error && <p className="admin-form-error">{error}</p>}
      <button type="submit" className="btn-primary-sm" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
    </form>
  )
}

function UpdateBadgeForm({ allBadges, onDone }: { allBadges: BadgeDto[]; onDone: () => void }) {
  const [searchName, setSearchName] = useState('')
  const [found, setFound] = useState<BadgeDto | null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [autoGiven, setAutoGiven] = useState(false)
  const [priority, setPriority] = useState(0)
  const [matrix, setMatrix] = useState<string[]>([...EMPTY_MATRIX])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleSearch() {
    const badge = allBadges.find(b => b.name.toLowerCase() === searchName.toLowerCase())
    if (badge) {
      setFound(badge)
      setName(badge.name)
      setDesc(badge.description)
      setAutoGiven(badge.automaticallyGiven)
      setPriority(badge.priority)
      const filled = [...(badge.pixelArt ?? [])].concat(EMPTY_MATRIX).slice(0, 64)
      setMatrix(filled)
    } else {
      setFound(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!found) { setError('Badge not found.'); return }
    setSaving(true); setError('')
    try {
      await updateBadge(found.id, { name, description: desc, pixelArt: JSON.stringify(matrix), automaticallyGiven: autoGiven, priority })
      onDone()
    } catch { setError('Failed to update badge.') }
    setSaving(false)
  }

  return (
    <form className="admin-badge-form" onSubmit={handleSubmit}>
      <label className="admin-form-label">Badge name (to find)</label>
      <div className="admin-search-row">
        <input className="admin-form-input" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="Exact badge name…" />
        <button type="button" className="btn-outline-sm" onClick={handleSearch}>Find</button>
      </div>
      {found && (
        <>
          <p className="admin-found-id">ID: {found.id}</p>
          <BadgeFormFields name={name} setName={setName} desc={desc} setDesc={setDesc}
            autoGiven={autoGiven} setAutoGiven={setAutoGiven} priority={priority} setPriority={setPriority} />
          <label className="admin-form-label">Pixel Art</label>
          <PixelEditor matrix={matrix} gridSize={8} cellSize={20} onChange={setMatrix} />
        </>
      )}
      {error && <p className="admin-form-error">{error}</p>}
      <button type="submit" className="btn-primary-sm" disabled={saving || !found}>{saving ? 'Saving…' : 'Update'}</button>
    </form>
  )
}

function BindBadgeForm({ allBadges }: { allBadges: BadgeDto[] }) {
  const [searchName, setSearchName] = useState('')
  const [found, setFound] = useState<BadgeDto | null>(null)
  const [userId, setUserId] = useState('')
  const [notifyUser, setNotifyUser] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  function handleSearch() {
    const badge = allBadges.find(b => b.name.toLowerCase() === searchName.toLowerCase())
    setFound(badge ?? null)
    setMessage(badge ? '' : 'Badge not found.')
  }

  async function handleBind() {
    if (!found || !userId) return
    setSaving(true); setMessage('')
    try {
      await assignBadge(found.id, Number(userId), notifyUser)
      setMessage('Badge assigned.')
    } catch { setMessage('Failed.') }
    setSaving(false)
  }

  async function handleUnbind() {
    if (!found || !userId) return
    setSaving(true); setMessage('')
    try {
      await unassignBadge(found.id, Number(userId))
      setMessage('Badge removed.')
    } catch { setMessage('Failed.') }
    setSaving(false)
  }

  return (
    <div className="admin-badge-form">
      <label className="admin-form-label">Badge name</label>
      <div className="admin-search-row">
        <input className="admin-form-input" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="Exact badge name…" />
        <button type="button" className="btn-outline-sm" onClick={handleSearch}>Find</button>
      </div>
      {found && <p className="admin-found-id">ID: {found.id} — {found.name}</p>}
      <label className="admin-form-label">User ID</label>
      <input className="admin-form-input" type="number" value={userId} onChange={e => setUserId(e.target.value)} placeholder="User ID" />
      <label className="admin-form-checkbox">
        <input type="checkbox" checked={notifyUser} onChange={e => setNotifyUser(e.target.checked)} />
        Notify user
      </label>
      <div className="admin-bind-actions">
        <button className="btn-primary-sm" onClick={handleBind} disabled={saving || !found || !userId}>
          {saving ? '…' : 'Bind'}
        </button>
        <button className="btn-outline-sm" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }} onClick={handleUnbind} disabled={saving || !found || !userId}>
          Unbind
        </button>
      </div>
      {message && <p className="admin-form-message">{message}</p>}
    </div>
  )
}

function BadgeFormFields({ name, setName, desc, setDesc, autoGiven, setAutoGiven, priority, setPriority }: {
  name: string; setName: (v: string) => void
  desc: string; setDesc: (v: string) => void
  autoGiven: boolean; setAutoGiven: (v: boolean) => void
  priority: number; setPriority: (v: number) => void
}) {
  return (
    <>
      <label className="admin-form-label">Name</label>
      <input className="admin-form-input" value={name} onChange={e => setName(e.target.value)} required />
      <label className="admin-form-label">Description</label>
      <input className="admin-form-input" value={desc} onChange={e => setDesc(e.target.value)} required />
      <label className="admin-form-checkbox">
        <input type="checkbox" checked={autoGiven} onChange={e => setAutoGiven(e.target.checked)} />
        Automatically given
      </label>
      <label className="admin-form-label">Priority</label>
      <input className="admin-form-input" type="number" value={priority} onChange={e => setPriority(Number(e.target.value))} min={0} />
    </>
  )
}

function BadgesSkeleton() {
  return (
    <div className="badges-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="badge-card">
          <div className="skeleton badge-art-skeleton" />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: 14, width: 100, marginBottom: 6, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 12, width: 160, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
