import { Link } from 'react-router-dom'
import type { ListCardData, HomeList, GameListCategoryDto } from '../types'
import './ListCard.css'

interface Props {
  list: ListCardData
}

const FALLBACK = "https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png"

export default function ListCard({ list }: Props) {
  const covers = list.topThreeWinners.slice(0, 3)
  const empty = 3 - covers.length

  return (
    <div className="list-card">
      <Link to={`/list/${list.slug}`} className="list-card-covers">
        {covers.map((w, index) => (
          <div key={w.gameId} className={`list-cover-slot list-cover-slot-${index + 1}`}>
            <img
              src={w.coverImageUrl || FALLBACK}
              alt={w.gameTitle}
              className="list-cover-img"
              loading="lazy"
              onError={e => { (e.target as HTMLImageElement).src = FALLBACK }}
            />
          </div>
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <div key={`ph-${i}`} className={`list-cover-slot list-cover-slot-${covers.length + i + 1}`}>
            <img src={FALLBACK} alt="" className="list-cover-img" />
          </div>
        ))}
      </Link>
      <div className="list-card-info">
        <Link to={`/list/${list.slug}`} className="list-card-title">
          {list.title}{list.year ? ` ${list.year}` : ''}
        </Link>
        <p className="list-card-meta">
          Based on <strong>{list.numberOfSources}</strong>{' '}
          {list.numberOfSources === 1 ? 'list' : 'lists'} &middot; {list.numberOfGames} games
        </p>
      </div>
    </div>
  )
}

// Helpers to convert API types → ListCardData
export function fromHomeList(l: HomeList): ListCardData {
  return { ...l, topThreeWinners: l.topThreeWinners }
}

export function fromCategoryDto(l: GameListCategoryDto): ListCardData {
  return {
    id: l.id,
    title: l.title,
    year: l.year,
    numberOfGames: l.numberOfGames,
    numberOfSources: l.numberOfSources,
    slug: l.slug,
    topThreeWinners: l.topWinners.slice(0, 3).map(w => ({
      gameId: w.gameId,
      gameTitle: w.gameTitle,
      coverImageUrl: w.coverImageUrl,
    })),
  }
}
