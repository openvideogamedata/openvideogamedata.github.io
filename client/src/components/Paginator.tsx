import type { Pager } from '../types'
import './Paginator.css'

interface Props {
  pager: Pager
  onPageChange: (page: number) => void
}

export default function Paginator({ pager, onPageChange }: Props) {
  const { currentPage, totalPages } = pager
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = buildPages(currentPage, totalPages)

  return (
    <div className="paginator">
      <button
        className="page-btn"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous"
      >‹</button>

      {pages.map((p, i) =>
        p === '...'
          ? <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
          : <button
              key={p}
              className={`page-btn ${p === currentPage ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
            >{p}</button>
      )}

      <button
        className="page-btn"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next"
      >›</button>
    </div>
  )
}

function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}
