import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import './AdminNewMasterList.css'

interface CreateListRequest {
  title: string
  year: number | null
  slug: string
  socialUrl: string
  tags: string
  consideredForAvgScore: boolean
  pinned: boolean
  pinnedPriority: number
  socialComments: number
}

const AVAILABLE_TAGS = [
  'all-time', 'decade', 'year', 'genre', 'platform', 'critic', 'user', 'community',
]

export default function AdminNewMasterList() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [slug, setSlug] = useState('')
  const [socialUrl, setSocialUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [consideredForAvgScore, setConsideredForAvgScore] = useState(true)
  const [pinned, setPinned] = useState(false)
  const [pinnedPriority, setPinnedPriority] = useState(0)
  const [socialComments, setSocialComments] = useState(0)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slug) {
      setSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }

  function toggleTag(tag: string) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !socialUrl.trim() || tags.length === 0) {
      setError('Title, social URL, and at least one tag are required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const body: CreateListRequest = {
        title: title.trim(),
        year: year ? Number(year) : null,
        slug: slug.trim() || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        socialUrl: socialUrl.trim(),
        tags: tags.join(','),
        consideredForAvgScore,
        pinned,
        pinnedPriority: pinned ? pinnedPriority : 0,
        socialComments,
      }
      await api.post('/api/game-lists', body)
      navigate('/admin/users')
    } catch {
      setError('Could not create the list. Please check your input and try again.')
      setSaving(false)
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
    <div className="admin-new-list-page">
      <section className="admin-header">
        <div className="container">
          <div className="admin-breadcrumb">Admin</div>
          <h1 className="page-title">New Master List</h1>
        </div>
      </section>

      <div className="container admin-body">
        <form className="new-list-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="e.g. Best Games of All Time"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-section">
              <label className="form-label">Year (optional)</label>
              <input
                className="form-input"
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                placeholder="e.g. 2024"
                min={1970}
                max={2100}
              />
            </div>
            <div className="form-section">
              <label className="form-label">Slug</label>
              <input
                className="form-input"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="auto-generated from title"
              />
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Social URL *</label>
            <input
              className="form-input"
              type="url"
              value={socialUrl}
              onChange={e => setSocialUrl(e.target.value)}
              placeholder="https://..."
              required
            />
          </div>

          <div className="form-section">
            <label className="form-label">Tags *</label>
            <div className="tag-pills">
              {AVAILABLE_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-pill ${tags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
            {tags.length > 0 && (
              <p className="tag-preview">Selected: {tags.join(', ')}</p>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">Social Comments</label>
            <input
              className="form-input"
              type="number"
              value={socialComments}
              onChange={e => setSocialComments(Number(e.target.value))}
              min={0}
            />
          </div>

          <div className="form-checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={consideredForAvgScore}
                onChange={e => setConsideredForAvgScore(e.target.checked)}
              />
              Considered for average score
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={pinned}
                onChange={e => setPinned(e.target.checked)}
              />
              Pinned on home page
            </label>
          </div>

          {pinned && (
            <div className="form-section">
              <label className="form-label">Pinned Priority</label>
              <input
                className="form-input"
                type="number"
                value={pinnedPriority}
                onChange={e => setPinnedPriority(Number(e.target.value))}
                min={0}
              />
              <p className="form-hint">Lower number = higher priority (0 = first).</p>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary form-submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create List'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate('/admin/users')}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
