import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import TabBar from '../components/TabBar'
import Paginator from '../components/Paginator'
import { getListBySlug, getCriticLists, getUserLists } from '../api/gameLists'
import type {
  GameListDetailsResponse,
  TopWinnerDto,
  SourceGameListDto,
  ContributorDto,
  TrackerStats,
} from '../api/gameLists'
import type { Pager } from '../types'
import './ListDetail.css'

export default function ListDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<GameListDetailsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [activeTab, setActiveTab] = useState('critics')
  const [criticLists, setCriticLists] = useState<SourceGameListDto[]>([])
  const [criticPager, setCriticPager] = useState<Pager | null>(null)
  const [criticLoading, setCriticLoading] = useState(false)
  const [userListsData, setUserListsData] = useState<SourceGameListDto[]>([])
  const [userListsPager, setUserListsPager] = useState<Pager | null>(null)
  const [userListsLoading, setUserListsLoading] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    Promise.all([
      getListBySlug(slug),
      getCriticLists(slug, 1, 3),
    ])
      .then(([detail, critics]) => {
        setData(detail)
        setCriticLists(critics.lists)
        setCriticPager(critics.pager as Pager)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    if (tab === 'users' && userListsData.length === 0 && slug) {
      setUserListsLoading(true)
      getUserLists(slug, 1, 5)
        .then(res => {
          setUserListsData(res.lists)
          setUserListsPager(res.pager as Pager)
          setUserListsLoading(false)
        })
        .catch(() => setUserListsLoading(false))
    }
  }

  function loadMoreCritics(page: number) {
    if (!slug) return
    setCriticLoading(true)
    getCriticLists(slug, page, 3)
      .then(res => { setCriticLists(res.lists); setCriticPager(res.pager as Pager) })
      .catch(() => {})
      .finally(() => setCriticLoading(false))
  }

  function loadMoreUserLists(page: number) {
    if (!slug) return
    setUserListsLoading(true)
    getUserLists(slug, page, 5)
      .then(res => { setUserListsData(res.lists); setUserListsPager(res.pager as Pager) })
      .catch(() => {})
      .finally(() => setUserListsLoading(false))
  }

  if (loading) return <ListDetailSkeleton />
  if (notFound || !data) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>List not found</h2>
      </div>
    )
  }

  const { finalGameList: fl, topWinnersByCritics, topWinnersByUsers,
    trackerStatsCritics, trackerStatsUsers, contributors, numberOfUsersLists } = data

  const winners = activeTab === 'critics' ? topWinnersByCritics : topWinnersByUsers
  const trackerStats = activeTab === 'critics' ? trackerStatsCritics : trackerStatsUsers

  return (
    <div className="list-detail-page">
      {/* Header */}
      <section className="list-detail-header">
        <div className="container">
          <div className="list-detail-tags">
            {fl.tagList.map(tag => (
              <span key={tag} className="list-tag">{tag}</span>
            ))}
          </div>
          <h1 className="page-title">{fl.fullName}</h1>
          <div className="list-detail-meta">
            {fl.year && <span className="meta-chip">{fl.year}</span>}
            <span className="meta-chip">{fl.consideredForAvgScore ? 'Scored' : 'Unscored'}</span>
            {fl.socialUrl && (
              <a href={fl.socialUrl} target="_blank" rel="noopener noreferrer" className="meta-chip meta-social">
                Discussion ↗
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="container list-detail-body">
        <div className="list-detail-main">
          {/* Tabs */}
          <TabBar
            tabs={[
              { key: 'critics', label: 'Critics', count: data.sources.length },
              { key: 'users', label: 'Users', count: Math.round(numberOfUsersLists) },
            ]}
            active={activeTab}
            onChange={handleTabChange}
          />

          {/* Top Winners */}
          {winners.length > 0 && (
            <div className="winners-section">
              <h2 className="winners-title">Top Games</h2>
              <div className="winners-grid">
                {winners.slice(0, 10).map(w => (
                  <WinnerCard key={w.gameId} winner={w} />
                ))}
              </div>
            </div>
          )}

          {/* Tracker stats */}
          <TrackerStatsBar stats={trackerStats} />

          {/* Source lists */}
          <div className="source-lists-section">
            <h2 className="section-heading">
              {activeTab === 'critics' ? 'Critic Lists' : 'User Lists'}
            </h2>

            {activeTab === 'critics' ? (
              criticLoading ? <SourceListsSkeleton /> : (
                <>
                  {criticLists.map(list => <SourceListRow key={list.id} list={list} />)}
                  {criticPager && criticPager.totalPages > 1 && (
                    <Paginator pager={criticPager} onPageChange={loadMoreCritics} />
                  )}
                </>
              )
            ) : (
              userListsLoading ? <SourceListsSkeleton /> : (
                <>
                  {userListsData.map(list => <SourceListRow key={list.id} list={list} />)}
                  {userListsPager && userListsPager.totalPages > 1 && (
                    <Paginator pager={userListsPager} onPageChange={loadMoreUserLists} />
                  )}
                </>
              )
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="list-detail-sidebar">
          {contributors.length > 0 && (
            <div className="sidebar-card">
              <h3 className="sidebar-title">Top Contributors</h3>
              {contributors.slice(0, 5).map(c => (
                <ContributorRow key={c.userContributedId} contributor={c} />
              ))}
            </div>
          )}

          {fl.similarLists.length > 0 && (
            <div className="sidebar-card">
              <h3 className="sidebar-title">Related Sources</h3>
              {fl.similarLists.slice(0, 5).map((s, i) => (
                <a key={i} href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="similar-source">
                  {s.sourceName} ↗
                </a>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function WinnerCard({ winner }: { winner: TopWinnerDto }) {
  return (
    <Link to={`/games/${winner.gameId}`} className="winner-card">
      <div className="winner-position">#{winner.position}</div>
      <div className="winner-cover-wrap">
        {winner.coverImageUrl ? (
          <img src={winner.coverImageUrl} alt={winner.gameTitle} className="winner-cover" loading="lazy" />
        ) : (
          <div className="winner-cover winner-cover-placeholder" />
        )}
      </div>
      <span className="winner-title">{winner.gameTitle}</span>
      <span className="winner-citations">{winner.porcentageOfCitations}%</span>
    </Link>
  )
}

function TrackerStatsBar({ stats }: { stats: TrackerStats }) {
  const total = stats.toPlay + stats.playing + stats.played + stats.beated + stats.abandoned
  if (total === 0) return null

  const items = [
    { label: 'To Play', value: stats.toPlay, color: '#7c3aed' },
    { label: 'Playing', value: stats.playing, color: '#06b6d4' },
    { label: 'Beaten', value: stats.beated, color: '#10b981' },
    { label: 'Played', value: stats.played, color: '#f59e0b' },
    { label: 'Abandoned', value: stats.abandoned, color: '#ef4444' },
  ].filter(i => i.value > 0)

  return (
    <div className="tracker-stats-bar">
      <span className="tracker-stats-label">Community tracking</span>
      <div className="tracker-bar">
        {items.map(item => (
          <div
            key={item.label}
            className="tracker-bar-segment"
            style={{ width: `${(item.value / total) * 100}%`, background: item.color }}
            title={`${item.label}: ${item.value}`}
          />
        ))}
      </div>
      <div className="tracker-legend">
        {items.map(item => (
          <span key={item.label} className="tracker-legend-item">
            <span className="tracker-dot" style={{ background: item.color }} />
            {item.label} ({item.value})
          </span>
        ))}
      </div>
    </div>
  )
}

function SourceListRow({ list }: { list: SourceGameListDto }) {
  const creator = list.source?.name ?? list.userContributed?.fullName ?? 'Unknown'
  const creatorNickname = list.userContributed?.nickname

  return (
    <Link to={`/source-lists/${list.id}`} className="source-list-row">
      <div className="source-list-row-main">
        <span className="source-list-creator">{creator}</span>
        {creatorNickname && (
          <span className="source-list-nick">@{creatorNickname}</span>
        )}
        {list.sourceListUrl && (
          <a
            href={list.sourceListUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="source-list-ext"
            onClick={e => e.stopPropagation()}
          >
            ↗
          </a>
        )}
      </div>
      <span className="source-list-count">{list.items.length} games</span>
    </Link>
  )
}

function ContributorRow({ contributor }: { contributor: ContributorDto }) {
  return (
    <Link to={`/users/${contributor.nickname}`} className="contributor-item">
      <span className="contributor-name">{contributor.fullName}</span>
      <span className="contributor-pct">{contributor.porcentageOfContributions}%</span>
    </Link>
  )
}

function ListDetailSkeleton() {
  return (
    <div className="list-detail-page">
      <section className="list-detail-header">
        <div className="container">
          <div className="skeleton" style={{ height: 36, width: 360, marginBottom: 12, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 18, width: 200, borderRadius: 4 }} />
        </div>
      </section>
      <div className="container list-detail-body">
        <div className="list-detail-main">
          <div className="winners-grid" style={{ marginTop: '2rem' }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ height: 120, borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 12, marginTop: 6, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SourceListsSkeleton() {
  return (
    <div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
          <div className="skeleton" style={{ height: 16, width: 180, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 16, width: 60, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}
