import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PixelArt from '../components/PixelArt'
import { getTopContributors } from '../api/users'
import type { TopContributorDto } from '../api/users'
import './TopContributors.css'

export default function TopContributors() {
  const [contributors, setContributors] = useState<TopContributorDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTopContributors()
      .then(res => { setContributors(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="top-contributors-page">
      <section className="top-contributors-header">
        <div className="container">
          <h1 className="page-title">Top Contributors</h1>
          <p className="page-subtitle">
            The community members who have contributed the most lists to OpenVGD.
          </p>
        </div>
      </section>

      <div className="container top-contributors-body">
        {loading ? (
          <ContributorsSkeleton />
        ) : contributors.length === 0 ? (
          <p className="empty-state">No contributors found.</p>
        ) : (
          <div className="contributors-table">
            <div className="contributors-head">
              <span>#</span>
              <span>User</span>
              <span>Contributions</span>
            </div>
            {contributors.map((user, i) => (
              <Link key={user.id} to={`/users/${user.nickname}`} className="contributor-row">
                <span className={`rank-badge ${i < 3 ? `rank-${i + 1}` : ''}`}>{i + 1}</span>
                <div className="contributor-info">
                  {user.userPicture ? (
                    <div className="contributor-avatar">
                      <PixelArt matrix={user.userPicture} cellSize={6} />
                    </div>
                  ) : (
                    <div className="contributor-avatar avatar-placeholder" />
                  )}
                  <div>
                    <span className="contributor-name">{user.fullName}</span>
                    <span className="contributor-nick">@{user.nickname}</span>
                  </div>
                </div>
                <span className="contributor-count">{user.contributions}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ContributorsSkeleton() {
  return (
    <div className="contributors-table">
      <div className="contributors-head">
        <span>#</span>
        <span>User</span>
        <span>Contributions</span>
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="contributor-row skeleton-row">
          <div className="skeleton" style={{ height: 20, width: 28, borderRadius: 4 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="skeleton" style={{ height: 30, width: 30, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 16, width: 140, borderRadius: 4 }} />
          </div>
          <div className="skeleton" style={{ height: 16, width: 40, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}
