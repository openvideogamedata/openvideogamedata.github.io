import { useState } from 'react'
import './PixelEditor.css'

const PALETTE: { code: string; color: string; label: string }[] = [
  { code: 'a', color: '#FCFCFC', label: 'White'       },
  { code: 'b', color: '#000000', label: 'Black'       },
  { code: 'c', color: '#a80020', label: 'Dark Red'    },
  { code: 'd', color: '#ac7c00', label: 'Brown'       },
  { code: 'e', color: '#503000', label: 'Dark Brown'  },
  { code: 'f', color: '#f87858', label: 'Salmon'      },
  { code: 'g', color: '#f0d0b0', label: 'Skin'        },
  { code: 'h', color: '#f8d878', label: 'Yellow'      },
  { code: 'i', color: '#00b800', label: 'Green'       },
  { code: 'j', color: '#00a800', label: 'Dark Green'  },
  { code: 'k', color: '#00fcfc', label: 'Cyan'        },
  { code: 'l', color: '#a4e4fc', label: 'Light Blue'  },
  { code: 'm', color: '#3cbcfc', label: 'Blue'        },
  { code: 'n', color: '#6844fc', label: 'Purple'      },
  { code: 'o', color: '#f8a4c0', label: 'Pink'        },
]
const TRANSPARENT = ' '

interface PixelEditorProps {
  matrix: string[]
  gridSize?: number
  cellSize?: number
  onChange: (matrix: string[]) => void
}

export default function PixelEditor({ matrix, gridSize = 8, cellSize = 28, onChange }: PixelEditorProps) {
  const [selectedColor, setSelectedColor] = useState<string>('b')
  const [painting, setPainting] = useState(false)

  const cols = gridSize
  const rows = Math.ceil(matrix.length / cols)

  function paint(index: number, draft: string[]) {
    if (draft[index] === selectedColor) {
      draft[index] = TRANSPARENT
    } else {
      draft[index] = selectedColor
    }
  }

  function handleMouseDown(index: number) {
    setPainting(true)
    const draft = [...matrix]
    paint(index, draft)
    onChange(draft)
  }

  function handleMouseEnter(index: number) {
    if (!painting) return
    const draft = [...matrix]
    draft[index] = selectedColor
    onChange(draft)
  }

  function handleMouseUp() {
    setPainting(false)
  }

  const svgSize = cols * cellSize

  return (
    <div className="pixel-editor" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {/* Canvas */}
      <svg
        width={svgSize}
        height={rows * cellSize}
        className="pixel-editor-canvas"
        style={{ userSelect: 'none' }}
      >
        {/* Background checkerboard to indicate transparency */}
        {Array.from({ length: cols * rows }, (_, i) => {
          const x = (i % cols) * cellSize
          const y = Math.floor(i / cols) * cellSize
          const code = matrix[i] ?? TRANSPARENT
          const entry = PALETTE.find(p => p.code === code)
          const fill = entry ? entry.color : 'transparent'
          return (
            <rect
              key={i}
              x={x} y={y}
              width={cellSize} height={cellSize}
              fill={fill}
              stroke="var(--border)"
              strokeWidth={0.5}
              style={{ cursor: 'crosshair' }}
              onMouseDown={() => handleMouseDown(i)}
              onMouseEnter={() => handleMouseEnter(i)}
            />
          )
        })}
      </svg>

      {/* Palette */}
      <div className="pixel-editor-palette">
        {PALETTE.map(p => (
          <button
            key={p.code}
            className={`palette-swatch ${selectedColor === p.code ? 'selected' : ''}`}
            style={{ background: p.color }}
            onClick={() => setSelectedColor(p.code)}
            title={p.label}
          />
        ))}
        <button
          className={`palette-swatch palette-transparent ${selectedColor === TRANSPARENT ? 'selected' : ''}`}
          onClick={() => setSelectedColor(TRANSPARENT)}
          title="Transparent / Erase"
        >✕</button>
      </div>
    </div>
  )
}
