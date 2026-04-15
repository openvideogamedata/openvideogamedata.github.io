import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getApiErrorMessage } from '../api/client'
import { getListBySlugLive, updateMasterList } from '../api/gameLists'
import './AdminNewMasterList.css'

const AVAILABLE_TAGS = [
  'all-time', 'decade', 'year', 'genre', 'platform', 'critic', 'user', 'community',
]

export default function AdminEditMasterList() {
  const { slug } = useParams<{ slug: string }>()
  const { user, loading: authLoading, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [listId, setListId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [socialUrl, setSocialUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [consideredForAvgScore, setConsideredForAvgScore] = useState(true)
  const [pinned, setPinned] = useState(false)
  const [pinnedPriority, setPinnedPriority] = useState(0)
  const [socialComments, setSocialComments] = useState(0)

  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    getListBySlugLive(slug)
      .then(res => {
        const fl = res.finalGameList
        setListId(fl.id)
        setTitle(fl.title)
        setYear(fl.year != null ? String(fl.year) : '')
        setSocialUrl(fl.socialUrl ?? '')
        setTags(fl.tags ? fl.tags.split(',').map(t => t.trim()).filter(Boolean) : [])
        setConsideredForAvgScore(fl.consideredForAvgScore)
        setPinned(fl.pinned)
        setPinnedPriority(fl.pinnedPriority)
        setSocialComments(fl.socialComments)
      })
      .catch(() => setError('Could not load list data.'))
      .finally(() => setLoadingData(false))
  }, [slug])

  function toggleTag(tag: string) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || tags.length === 0) {
      setError('Title and at least one tag are required.')
      return
    }
    if (!listId) return

    setSaving(true)
    setError(null)
    try {
      await updateMasterList(listId, {
        title: title.trim(),
        year: year ? Number(year) : null,
        socialUrl: socialUrl.trim() || null,
        tags: tags.join(','),
        consideredForAvgScore,
        pinned,
        pinnedPriority: pinned ? pinnedPriority : 0,
        socialComments,
      })
      navigate(`/list/${slug}`)
    } catch (error) {
      setError(getApiErrorMessage(error, 'Could not save changes. Please try again.'))
      setSaving(false)
    }
  }

  if (authLoading || loadingData) return null

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
          <h1 className="page-title">Edit Master List</h1>
        </div>
      </section>

      <div className="container admin-body">
        <form className="new-list-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
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
                disabled
                title="Slug cannot be changed"
              />
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Social URL</label>
            <input
              className="form-input"
              type="url"
              value={socialUrl}
              onChange={e => setSocialUrl(e.target.value)}
              placeholder="https://..."
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
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate(`/list/${slug}`)}
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
