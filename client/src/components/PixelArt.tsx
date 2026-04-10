// Color codes match PixelEditor.razor's color palette
const COLOR_MAP: Record<string, string> = {
  a: '#FCFCFC',
  b: '#000000',
  c: '#a80020',
  d: '#ac7c00',
  e: '#503000',
  f: '#f87858',
  g: '#f0d0b0',
  h: '#f8d878',
  i: '#00b800',
  j: '#00a800',
  k: '#00fcfc',
  l: '#a4e4fc',
  m: '#3cbcfc',
  n: '#6844fc',
  o: '#f8a4c0',
}

interface PixelArtProps {
  // Flat array of 1-char color codes (e.g. 64 elements for an 8×8 grid)
  matrix: string[]
  // Pixels per side — default: sqrt(matrix.length), assumed square
  gridSize?: number
  // CSS pixels per cell (default 4)
  cellSize?: number
  className?: string
}

export default function PixelArt({ matrix, gridSize, cellSize = 4, className }: PixelArtProps) {
  const cols = gridSize ?? Math.round(Math.sqrt(matrix.length))
  const rows = gridSize ?? Math.round(matrix.length / cols)
  const w = cols * cellSize
  const h = rows * cellSize

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    >
      {matrix.map((code, i) => {
        const x = (i % cols) * cellSize
        const y = Math.floor(i / cols) * cellSize
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            fill={COLOR_MAP[code] ?? '#000000'}
          />
        )
      })}
    </svg>
  )
}
