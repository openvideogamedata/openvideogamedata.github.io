const COLOR_MAP: Record<string, string> = {
  '0': '#7c3aed', '1': '#a78bfa', '2': '#06b6d4', '3': '#10b981',
  '4': '#f59e0b', '5': '#ef4444', '6': '#e2e8f0', '7': '#1e1e38',
  '8': '#6d28d9', '9': '#0e7490',
}

function charToColor(c: string): string {
  return COLOR_MAP[c] ?? '#1e1e38'
}

interface PixelArtProps {
  matrix: string[]
  size?: number       // grid dimension (default 5)
  cellSize?: number   // px per cell (default 4)
  className?: string
}

export default function PixelArt({ matrix, size = 5, cellSize = 4, className }: PixelArtProps) {
  const canvasSize = size * cellSize
  return (
    <svg
      width={canvasSize}
      height={canvasSize}
      viewBox={`0 0 ${canvasSize} ${canvasSize}`}
      className={className}
    >
      {matrix.slice(0, size).map((row, y) =>
        row.split('').slice(0, size).map((char, x) => (
          <rect
            key={`${x}-${y}`}
            x={x * cellSize}
            y={y * cellSize}
            width={cellSize}
            height={cellSize}
            fill={charToColor(char)}
          />
        ))
      )}
    </svg>
  )
}
