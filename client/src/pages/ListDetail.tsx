import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import TabBar from '../components/TabBar'
import Paginator from '../components/Paginator'
import { getListBySlug, getCriticLists, getUserLists } from '../api/gameLists'
import type {
  GameListDetailsResponse,
  TopWinnerDto,
  SourceGameListDto,
  ContributorDto,
  TrackerStats,
  SourceListDto,
} from '../api/gameLists'
import type { Pager } from '../types'
import './ListDetail.css'

export default function ListDetail() {
  const { slug, mode } = useParams<{ slug: string; mode?: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<GameListDetailsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const initialTab = mode === 'users' ? 'users' : 'critics'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [criticLists, setCriticLists] = useState<SourceGameListDto[]>([])
  const [criticPager, setCriticPager] = useState<Pager | null>(null)
  const [criticLoading, setCriticLoading] = useState(false)
  const [userListsData, setUserListsData] = useState<SourceGameListDto[]>([])
  const [userListsPager, setUserListsPager] = useState<Pager | null>(null)
  const [userListsLoading, setUserListsLoading] = useState(false)
  const [userListsLoaded, setUserListsLoaded] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    Promise.all([
      getListBySlug(slug),
      getCriticLists(slug, 1, 5),
    ])
      .then(([detail, critics]) => {
        setData(detail)
        setCriticLists(critics.lists)
        setCriticPager(critics.pager as Pager)
        setLoading(false)
        // If mode is users, load user lists immediately
        if (mode === 'users') {
          setUserListsLoading(true)
          getUserLists(slug, 1, 5)
            .then(res => {
              setUserListsData(res.lists)
              setUserListsPager(res.pager as Pager)
              setUserListsLoaded(true)
            })
            .catch(() => {})
            .finally(() => setUserListsLoading(false))
        }
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    if (slug) {
      navigate(`/list/${slug}/${tab}`, { replace: true })
    }
    if (tab === 'users' && !userListsLoaded && slug) {
      setUserListsLoading(true)
      getUserLists(slug, 1, 5)
        .then(res => {
          setUserListsData(res.lists)
          setUserListsPager(res.pager as Pager)
          setUserListsLoaded(true)
        })
        .catch(() => {})
        .finally(() => setUserListsLoading(false))
    }
  }

  function loadMoreCritics(page: number) {
    if (!slug) return
    setCriticLoading(true)
    getCriticLists(slug, page, 5)
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
                {fl.socialComments > 0 ? `${fl.socialComments} comments ↗` : 'Discussion ↗'}
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
          {winners.length > 0 ? (
            <div className="winners-section">
              <h2 className="winners-title">
                Top {winners.length} Games — by {activeTab === 'critics' ? `${data.sources.length} critic list${data.sources.length !== 1 ? 's' : ''}` : `${Math.round(numberOfUsersLists)} user list${numberOfUsersLists !== 1 ? 's' : ''}`}
              </h2>
              <div className="winners-grid">
                {winners.map((w, i) => (
                  <WinnerCard key={w.gameId} winner={w} rank={i + 1} />
                ))}
              </div>
              <WinnersLegend />
            </div>
          ) : (
            <p className="no-lists-msg">
              {activeTab === 'critics'
                ? 'No critic lists yet. Help us by adding a source!'
                : 'No user lists yet. Be the first to create one!'}
            </p>
          )}

          {/* Tracker stats */}
          <TrackerStatsBar stats={trackerStats} />

          {/* All Sources (critics tab only) */}
          {activeTab === 'critics' && data.sources.length > 0 && (
            <AllSourcesList sources={data.sources} />
          )}

          {/* Source / User lists */}
          <div className="source-lists-section">
            <h2 className="section-heading">
              {activeTab === 'critics'
                ? `Critic Lists (${data.sources.length})`
                : `User Lists (${Math.round(numberOfUsersLists)})`}
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
                  {!userListsLoaded && !userListsLoading && (
                    <p className="no-lists-msg">Switch to Users tab to load user lists.</p>
                  )}
                </>
              )
            )}
          </div>

          {/* Add list CTA */}
          <div className="list-actions">
            <Link to={`/lists/new?slug=${fl.slug}`} className="btn-primary-sm">
              + Add your list
            </Link>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="list-detail-sidebar">
          <div className="sidebar-card sidebar-stats">
            <div className="sidebar-stat">
              <span className="sidebar-stat-value">{data.sources.length}</span>
              <span className="sidebar-stat-label">Critic lists</span>
            </div>
            <div className="sidebar-stat">
              <span className="sidebar-stat-value">{Math.round(numberOfUsersLists)}</span>
              <span className="sidebar-stat-label">User lists</span>
            </div>
            <div className="sidebar-stat">
              <span className="sidebar-stat-value">{winners.length}</span>
              <span className="sidebar-stat-label">Ranked games</span>
            </div>
          </div>

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
              {fl.similarLists.map((s, i) => (
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

function WinnerCard({ winner, rank }: { winner: TopWinnerDto; rank: number }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
  return (
    <Link to={`/games/${winner.gameId}`} className="winner-card">
      <div className="winner-position">{medal}</div>
      <div className="winner-cover-wrap">
        {winner.coverImageUrl ? (
          <img src={winner.coverImageUrl} alt={winner.gameTitle} className="winner-cover" loading="lazy" />
        ) : (
          <div className="winner-cover winner-cover-placeholder" />
        )}
      </div>
      <span className="winner-title">{winner.gameTitle}</span>
      <span className="winner-year">{winner.releaseYear}</span>
      <div className="winner-stats">
        <span className="winner-stat" title="% of lists featuring this game">{winner.porcentageOfCitations}% lists</span>
        <span className="winner-stat winner-score" title="Score based on position weight">score: {winner.score}</span>
      </div>
    </Link>
  )
}

function WinnersLegend() {
  return (
    <div className="winners-legend">
      <span><b>Lists %</b>: percentage of lists where the game appears.</span>
      <span><b>Score</b>: position weight (1st = 15 pts, 2nd = 14 pts…).</span>
    </div>
  )
}

function AllSourcesList({ sources }: { sources: SourceListDto[] }) {
  return (
    <div className="all-sources-section">
      <h2 className="section-heading">All Sources ({sources.length})</h2>
      <div className="all-sources-list">
        {sources.map((s, i) => (
          <span key={i} className="source-chip">
            <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-chip-link">
              {s.sourceName}
            </a>
            {s.sourceDateLastUpdated && (
              <span className="source-chip-date">
                {new Date(s.sourceDateLastUpdated).toLocaleDateString('en', { year: 'numeric', month: 'short' })}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
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
  const dateStr = list.dateLastUpdated ?? list.dateAdded
  const dateFormatted = dateStr
    ? new Date(dateStr).toLocaleDateString('en', { year: 'numeric', month: 'short' })
    : null

  return (
    <div className="source-list-block">
      <div className="source-list-block-header">
        <div className="source-list-block-meta">
          <Link to={`/source-lists/${list.id}`} className="source-list-creator-link">
            {creator}
          </Link>
          {creatorNickname && (
            <Link to={`/users/${creatorNickname}`} className="source-list-nick">
              @{creatorNickname}
            </Link>
          )}
          {list.sourceListUrl && (
            <a
              href={list.sourceListUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="source-list-ext"
              onClick={e => e.stopPropagation()}
            >
              ↗ source
            </a>
          )}
        </div>
        <div className="source-list-block-right">
          {dateFormatted && <span className="source-list-date">{dateFormatted}</span>}
          <span className="source-list-count">{list.items.length} games</span>
        </div>
      </div>

      {list.items.length > 0 && (
        <ol className="source-list-items">
          {list.items.map(item => (
            <li key={item.id} className="source-list-item">
              <Link to={`/games/${item.gameId}`} className="source-list-item-title">
                {item.gameTitle}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
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
            {Array.from({ length: 15 }).map((_, i) => (
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
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="source-list-block" style={{ marginBottom: '1rem' }}>
          <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 8, borderRadius: 4 }} />
          {Array.from({ length: 5 }).map((__, j) => (
            <div key={j} className="skeleton" style={{ height: 14, width: '80%', marginBottom: 4, borderRadius: 3 }} />
          ))}
        </div>
      ))}
    </div>
  )
}
