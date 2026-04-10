const DEFAULT_PIXEL_ART = [
  'l', 'm', 'l', 'm', 'l', 'm', 'l', 'm',
  'm', 'l', 'm', 'l', 'm', 'l', 'm', 'l',
  'l', 'm', 'b', 'm', 'l', 'b', 'l', 'm',
  'm', 'l', 'b', 'l', 'm', 'b', 'm', 'l',
  'l', 'm', 'l', 'm', 'l', 'm', 'l', 'm',
  'm', 'b', 'm', 'l', 'm', 'l', 'b', 'l',
  'l', 'b', 'b', 'b', 'b', 'b', 'b', 'm',
  'm', 'l', 'm', 'l', 'm', 'l', 'm', 'l',
]

const COLOR_CODES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o']

function seededRandom(seed: number) {
  let state = Math.max(1, seed % 2147483647)
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

function seedFromName(name: string): number {
  const firstName = name.trim().split(/\s+/)[0] ?? ''
  return firstName
    .slice(0, 6)
    .toUpperCase()
    .split('')
    .reduce((sum, char) => sum + Math.max(0, char.charCodeAt(0) - 64), 0) || 1
}

function randomInt(random: () => number, min: number, maxExclusive: number): number {
  return Math.floor(random() * (maxExclusive - min)) + min
}

function withIndexes(matrix: string[], indexes: number[], color: string): string[] {
  const next = [...matrix]
  indexes.forEach(index => { next[index] = color })
  return next
}

export function generateDefaultPixelArt(seedName: string): string[] {
  try {
    if (!seedName.trim()) return [...DEFAULT_PIXEL_ART]

    const random = seededRandom(seedFromName(seedName))
    const isBrown = randomInt(random, 0, 101) > 65
    const isDark = randomInt(random, 0, 101) > 90

    let minColor = 10
    let maxColor = 13
    let drawColor = 'b'
    let backColor = 'l'

    if (isDark) {
      minColor = 1
      maxColor = 3
      drawColor = 'a'
      backColor = 'b'
    } else if (isBrown) {
      minColor = 6
      maxColor = 8
      drawColor = 'e'
      backColor = 'g'
    }

    let result = Array.from({ length: 64 }, (_, i) =>
      i % 2 === 0 ? backColor : COLOR_CODES[randomInt(random, minColor, maxColor)]
    )

    const eyes = randomInt(random, 0, 5)
    const mouth = randomInt(random, 0, 5)

    const eyePatterns = [
      [9, 14, 18, 21, 26, 29],
      [18, 21, 25, 30],
      [18, 21, 25, 27, 28, 30],
      [18, 21, 26, 29],
      [10, 13, 18, 21, 26, 29],
    ]
    result = withIndexes(result, eyePatterns[eyes], drawColor)

    const mouthPatterns = [
      [42, 43, 44, 45, 49, 50, 51, 52, 53, 54],
      [42, 43, 44, 45, 50, 53],
      [41, 46, 49, 50, 51, 52, 53, 54],
      [50, 51],
      [43, 44, 51, 52],
    ]
    result = withIndexes(result, mouthPatterns[mouth], drawColor)

    return result
  } catch {
    return [...DEFAULT_PIXEL_ART]
  }
}
