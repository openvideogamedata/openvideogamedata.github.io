import { Link } from 'react-router-dom'
import type { GameSummary } from '../types'
import './GameCard.css'

interface Props {
  game: GameSummary
}

export default function GameCard({ game }: Props) {
  const score = game.score ?? 0

  return (
    <Link to={`/games/${game.id}`} className="game-card">
      <div className="game-card-cover">
        <img
          src={game.coverBigImageUrl || game.coverImageUrl}
          alt={game.title}
          loading="lazy"
          onError={e => {
            (e.target as HTMLImageElement).src =
              `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%231e1e38'/%3E%3Ctext x='100' y='150' text-anchor='middle' fill='%23475569' font-size='14' font-family='sans-serif'%3ENo cover%3C/text%3E%3C/svg%3E`
          }}
        />
        {score > 0 && (
          <div className={`game-score ${scoreClass(score)}`}>
            {score}
          </div>
        )}
      </div>
      <div className="game-card-info">
        <p className="game-title">{game.title}</p>
        <p className="game-meta">
          <span>{game.releaseYear}</span>
          {game.numberOfLists > 0 && (
            <span className="game-lists-count">
              {game.numberOfLists} {game.numberOfLists === 1 ? 'list' : 'lists'}
            </span>
          )}
        </p>
      </div>
    </Link>
  )
}

function scoreClass(score: number): string {
  if (score >= 85) return 'score-great'
  if (score >= 70) return 'score-good'
  if (score >= 50) return 'score-ok'
  return 'score-low'
}
