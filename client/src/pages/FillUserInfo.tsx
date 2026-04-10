import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import './FillUserInfo.css'

type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function FillUserInfo() {
  const [nickname, setNickname] = useState('')
  const [availability, setAvailability] = useState<AvailabilityState>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = nickname.trim()
    if (trimmed.length < 3) { setAvailability('idle'); return }
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(trimmed)) { setAvailability('invalid'); return }

    setAvailability('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get<{ nickname: string; available: boolean }>(
          `/api/users/nickname-availability?nickname=${encodeURIComponent(trimmed)}`
        )
        setAvailability(res.available ? 'available' : 'taken')
      } catch {
        setAvailability('idle')
      }
    }, 500)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [nickname])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (availability !== 'available') return
    setSaving(true)
    setError(null)
    try {
      await api.put('/api/users/me/nickname', { nickname: nickname.trim() })
      navigate('/')
    } catch {
      setError('Could not save nickname. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fill-page">
      <div className="fill-card">
        <h1 className="fill-title">Choose your nickname</h1>
        <p className="fill-subtitle">
          This is how you'll appear on OpenVGD. You can change it later.
        </p>

        <form className="fill-form" onSubmit={handleSubmit}>
          <div className="fill-input-wrap">
            <span className="fill-at">@</span>
            <input
              className={`fill-input ${availability === 'taken' ? 'input-error' : availability === 'available' ? 'input-ok' : ''}`}
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="yournickname"
              maxLength={30}
              autoFocus
            />
            <span className="fill-status">
              {availability === 'checking' && <span className="status-checking">…</span>}
              {availability === 'available' && <span className="status-ok">✓</span>}
              {availability === 'taken' && <span className="status-err">✗ taken</span>}
              {availability === 'invalid' && <span className="status-err">a–z, 0–9, _ -</span>}
            </span>
          </div>
          <p className="fill-hint">3–30 characters. Letters, numbers, _ and - only.</p>

          {error && <p className="fill-error">{error}</p>}

          <button
            type="submit"
            className="btn-primary fill-submit"
            disabled={availability !== 'available' || saving}
          >
            {saving ? 'Saving…' : 'Save nickname'}
          </button>
        </form>
      </div>
    </div>
  )
}
