import { Link } from 'react-router-dom'
import GameQuickActions from './GameQuickActions'
import type { GameSummary } from '../types'
import './GameCard.css'

interface Props {
  game: GameSummary
}

export default function GameCard({ game }: Props) {
  return (
    <article className="game-card">
      <GameQuickActions game={game} />
      <div className="game-card-info">
        <Link to={`/games/${game.id}`} className="game-title-link">
          <p className="game-title">{game.title}</p>
        </Link>
        <p className="game-meta">
          <span>{game.releaseYear}</span>
          {game.numberOfLists > 0 && (
            <span className="game-lists-count">
              {game.numberOfLists} {game.numberOfLists === 1 ? 'list' : 'lists'}
            </span>
          )}
        </p>
      </div>
    </article>
  )
}
