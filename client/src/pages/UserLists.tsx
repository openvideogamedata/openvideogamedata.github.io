import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Paginator from '../components/Paginator'
import { getListsByUser } from '../api/userLists'
import type { SourceGameListDto } from '../api/gameLists'
import type { Pager } from '../types'
import { timeAgo } from '../utils/time'
import './UserLists.css'

export default function UserLists() {
  const { nickname } = useParams<{ nickname: string }>()
  const [lists, setLists] = useState<SourceGameListDto[]>([])
  const [pager, setPager] = useState<Pager | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  function load(page: number) {
    if (!nickname) return
    setLoading(true)
    getListsByUser(nickname, page, 9)
      .then(res => { setLists(res.lists); setPager(res.pager as Pager) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(1) }, [nickname]) // eslint-disable-line react-hooks/exhaustive-deps

  if (notFound) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2>User not found</h2>
      </div>
    )
  }

  return (
    <div className="user-lists-page">
      <section className="user-lists-header">
        <div className="container">
          <Link to={`/users/${nickname}`} className="back-link">← @{nickname}</Link>
          <h1 className="page-title">Lists by {nickname}</h1>
        </div>
      </section>

      <div className="container user-lists-body">
        {loading ? (
          <UserListsSkeleton />
        ) : lists.length === 0 ? (
          <p className="empty-state">No lists submitted yet.</p>
        ) : (
          <>
            <div className="user-lists-grid">
              {lists.map(list => <UserListCard key={list.id} list={list} />)}
            </div>
            {pager && <Paginator pager={pager} onPageChange={load} />}
          </>
        )}
      </div>
    </div>
  )
}

function UserListCard({ list }: { list: SourceGameListDto }) {
  const masterList = list.finalGameList
  const topItems = list.items.slice(0, 3)

  return (
    <Link to={`/source-lists/${list.id}`} className="user-list-card">
      <div className="user-list-covers">
        {topItems.map(item => (
          item.coverImageUrl
            ? <img key={item.id} src={item.coverImageUrl} alt={item.gameTitle} className="ul-cover" loading="lazy" />
            : <div key={item.id} className="ul-cover ul-cover-placeholder" />
        ))}
        {topItems.length === 0 && <div className="ul-cover ul-cover-placeholder" />}
      </div>
      <div className="user-list-info">
        {masterList && (
          <span className="user-list-master">{masterList.fullName}</span>
        )}
        <span className="user-list-count">{list.items.length} games</span>
        <span className="user-list-date">{timeAgo(list.dateAdded)}</span>
      </div>
    </Link>
  )
}

function UserListsSkeleton() {
  return (
    <div className="user-lists-grid">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="user-list-card">
          <div className="skeleton" style={{ height: 100, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 14, marginTop: 8, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}
