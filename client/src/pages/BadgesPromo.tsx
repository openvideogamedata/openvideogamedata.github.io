import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PixelArt from '../components/PixelArt'
import { getBadges } from '../api/badges'
import type { BadgeDto } from '../api/badges'
import './BadgesPromo.css'

export default function BadgesPromo() {
  const [badges, setBadges] = useState<BadgeDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBadges()
      .then(res => { setBadges(res.badges.slice(0, 6)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="promo-page">
      <section className="promo-hero">
        <div className="container promo-hero-inner">
          <div className="promo-label">Earn while you play</div>
          <h1 className="promo-title">
            Collect <span className="promo-accent">Pixel Art</span> Badges
          </h1>
          <p className="promo-subtitle">
            Contribute lists, track games, make friends — each action unlocks a unique
            hand-crafted pixel art badge on your profile.
          </p>
          <div className="promo-cta">
            <Link to="/badges" className="btn-primary promo-btn">See all badges</Link>
            <Link to="/" className="btn-ghost promo-btn">Explore lists</Link>
          </div>
        </div>
      </section>

      {!loading && badges.length > 0 && (
        <section className="promo-badges-section">
          <div className="container">
            <h2 className="promo-section-title">Featured badges</h2>
            <div className="promo-badges-grid">
              {badges.map(badge => (
                <PromoBadge key={badge.id} badge={badge} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="promo-how">
        <div className="container">
          <h2 className="promo-section-title">How to earn</h2>
          <div className="promo-steps">
            {[
              { icon: '📋', title: 'Submit a list', desc: 'Add a critic or personal ranking to any game list.' },
              { icon: '🎮', title: 'Track games', desc: 'Mark games as To Play, Playing, Beaten or Abandoned.' },
              { icon: '🤝', title: 'Make friends', desc: 'Connect with other players and compare your collections.' },
            ].map(step => (
              <div key={step.title} className="promo-step">
                <span className="promo-step-icon">{step.icon}</span>
                <h3 className="promo-step-title">{step.title}</h3>
                <p className="promo-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function PromoBadge({ badge }: { badge: BadgeDto }) {
  return (
    <div className="promo-badge-card">
      <div className="promo-badge-art">
        {badge.pixelArt
          ? <PixelArt matrix={badge.pixelArt} cellSize={8} />
          : <div className="promo-badge-placeholder" />
        }
      </div>
      <div className="promo-badge-info">
        <span className="promo-badge-name">{badge.name}</span>
        <span className="promo-badge-desc">{badge.description}</span>
      </div>
    </div>
  )
}
