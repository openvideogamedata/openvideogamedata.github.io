import PixelArt from './PixelArt'
import { generateDefaultPixelArt } from '../utils/pixelArt'

interface UserAvatarProps {
  userPicture: string[] | null | undefined
  name: string
  cellSize?: number
  className?: string
}

export default function UserAvatar({ userPicture, name, cellSize = 4, className }: UserAvatarProps) {
  const matrix = userPicture && userPicture.length > 0
    ? userPicture
    : generateDefaultPixelArt(name)

  return <PixelArt matrix={matrix} cellSize={cellSize} className={className} />
}
