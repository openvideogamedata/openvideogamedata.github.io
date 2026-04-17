import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Paginator from '../components/Paginator'
import { getSourceDetails, type SourceDetailsResponse, type SourceGameListDto } from '../api/gameLists'
import { ApiError, getApiErrorMessage } from '../api/client'
import type { Pager } from '../types'
import './SourceDetail.css'

export default function SourceDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<SourceDetailsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [id])

  useEffect(() => {
    if (!id) return

    setLoading(true)
    setNotFound(false)
    setErrorMessage('')

    getSourceDetails(id, page, 15)
      .then(setData)
      .catch((error: unknown) => {
        setData(null)

        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true)
          return
        }

        setErrorMessage(getApiErrorMessage(error, 'Could not load this source right now.'))
      })
      .finally(() => setLoading(false))
  }, [id, page])

  const pager = data?.pager as Pager | undefined
  const source = data?.source

  const totals = useMemo(() => ({
    lists: source?.listsCount ?? 0,
    masterLists: source?.categoriesCount ?? 0,
  }), [source])

  if (loading) {
    return (
      <div className="source-detail-page">
        <div className="container source-detail-grid">
          <div className="skeleton" style={{ height: 220, borderRadius: 28 }} />
          <div className="skeleton" style={{ height: 220, borderRadius: 28 }} />
          <div className="skeleton" style={{ height: 360, borderRadius: 24, gridColumn: '1 / -1' }} />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="source-detail-page">
        <div className="container sources-empty">
          <h2>Source not found</h2>
          <p>This source does not exist in the OpenVGD index.</p>
        </div>
      </div>
    )
  }

  if (errorMessage || !data || !source) {
    return (
      <div className="source-detail-page">
        <div className="container sources-empty">
          <h2>Could not load source</h2>
          <p>{errorMessage || 'Try again in a moment.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="source-detail-page">
      <section className="source-detail-hero">
        <div className="container source-detail-grid">
          <div className="source-detail-card source-detail-intro">
            <span className="source-detail-kicker">Source Profile</span>
            <h1>{source.name}</h1>
            <a href={normalizeHost(source.hostUrl)} target="_blank" rel="noopener noreferrer" className="source-detail-domain">
              {source.hostUrl}
            </a>
            <p>
              This page groups every critic list from this source that is currently indexed by OpenVGD.
            </p>
          </div>

          <div className="source-detail-card source-detail-stats">
            <div className="source-detail-stat">
              <span>Published lists</span>
              <strong>{totals.lists}</strong>
            </div>
            <div className="source-detail-stat">
              <span>Master lists covered</span>
              <strong>{totals.masterLists}</strong>
            </div>
            <div className="source-detail-stat">
              <span>Last activity</span>
              <strong>{formatDate(source.lastActivity)}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="container source-detail-body">
        <section className="source-detail-panel">
          <div className="source-detail-panel-header">
            <div>
              <span className="source-detail-section-kicker">Coverage</span>
              <h2>Top master lists</h2>
            </div>
          </div>
          {source.masterLists.length === 0 ? (
            <div className="source-detail-empty">No master lists linked yet.</div>
          ) : (
            <div className="source-master-list-grid">
              {source.masterLists.map(item => (
                <Link key={item.id} to={`/list/${item.slug}`} className="source-master-list-card">
                  <strong>{item.title}{item.year ? ` ${item.year}` : ''}</strong>
                  <span>{item.listsCount} list{item.listsCount !== 1 ? 's' : ''} from this source</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="source-detail-panel">
          <div className="source-detail-panel-header">
            <div>
              <span className="source-detail-section-kicker">Indexed Lists</span>
              <h2>All lists from this source</h2>
            </div>
          </div>

          <div className="source-detail-list">
            {data.lists.map(list => (
              <SourceListRow key={list.id} list={list} />
            ))}
          </div>

          {pager && <Paginator pager={pager} onPageChange={setPage} />}
        </section>
      </div>
    </div>
  )
}

function SourceListRow({ list }: { list: SourceGameListDto }) {
  const updatedLabel = list.dateLastUpdated ? ` - updated ${formatDate(list.dateLastUpdated)}` : ''

  return (
    <article className="source-index-row">
      <div className="source-index-row-main">
        <strong>{list.finalGameList?.fullName ?? 'Untitled list'}</strong>
        <p>
          {list.items.length} game{list.items.length !== 1 ? 's' : ''}
          {updatedLabel}
        </p>
      </div>
      <div className="source-index-row-actions">
        {list.sourceListUrl && (
          <a href={list.sourceListUrl} target="_blank" rel="noopener noreferrer" className="source-index-link">
            Original
          </a>
        )}
        <Link to={`/source-lists/${list.id}`} className="source-index-link source-index-link-primary">
          View in OpenVGD
        </Link>
      </div>
    </article>
  )
}

function normalizeHost(hostUrl: string): string {
  if (hostUrl.startsWith('http://') || hostUrl.startsWith('https://')) return hostUrl
  return `https://${hostUrl}`
}

function formatDate(value: string | null): string {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString()
}
