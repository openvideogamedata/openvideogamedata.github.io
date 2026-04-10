import { Link } from 'react-router-dom'
import type { HomeList } from '../types'
import './ListCard.css'

interface Props {
  list: HomeList
}

const FALLBACK_COVER = "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"

export default function ListCard({ list }: Props) {
  const covers = list.topThreeWinners.slice(0, 3)

  return (
    <div className="list-card">
      <Link to={`/list/${list.slug}`} className="list-card-covers">
        {covers.length > 0
          ? covers.map(w => (
              <img
                key={w.gameId}
                src={w.coverImageUrl || FALLBACK_COVER}
                alt={w.gameTitle}
                className="list-cover-img"
                loading="lazy"
                onError={e => { (e.target as HTMLImageElement).src = FALLBACK_COVER }}
              />
            ))
          : Array.from({ length: 3 }).map((_, i) => (
              <img key={i} src={FALLBACK_COVER} alt="" className="list-cover-img" />
            ))
        }
        {covers.length < 3 && Array.from({ length: 3 - covers.length }).map((_, i) => (
          <img key={`empty-${i}`} src={FALLBACK_COVER} alt="" className="list-cover-img" />
        ))}
      </Link>
      <div className="list-card-info">
        <Link to={`/list/${list.slug}`} className="list-card-title">
          {list.title}{list.year ? ` ${list.year}` : ''}
        </Link>
        <p className="list-card-meta">
          Based on <strong>{list.numberOfSources}</strong> {list.numberOfSources === 1 ? 'list' : 'lists'} &middot; {list.numberOfGames} games
        </p>
      </div>
    </div>
  )
}
