import { useState, useEffect } from 'react'
import { getBadges } from '../api/badges'
import type { BadgeDto, BadgesResponse } from '../api/badges'
import PixelArt from '../components/PixelArt'
import './Badges.css'

export default function Badges() {
  const [data, setData] = useState<BadgesResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBadges()
      .then(res => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BadgeCard({ badge, earned }: { badge: BadgeDto; earned: boolean }) {
  return (
    <div className={`badge-card ${earned ? 'earned' : 'locked'}`}>
      <div className="badge-art">
        {badge.pixelArt ? (
          <PixelArt matrix={badge.pixelArt} size={5} cellSize={10} className={earned ? '' : 'badge-art-locked'} />
        ) : (
          <div className="badge-art-placeholder" />
        )}
        {earned && <span className="badge-earned-dot" title="Earned" />}
      </div>
      <div className="badge-info">
        <span className="badge-name">{badge.name}</span>
        <span className="badge-desc">{badge.description}</span>
      </div>
    </div>
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
