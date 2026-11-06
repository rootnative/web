import normalizeColor from '@react-native/normalize-colors'

export const toCSSColor = (value: unknown): string | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const packed = normalizeColor(value)
  if (packed === null || packed === undefined) return undefined

  const r = (packed >>> 24) & 0xff
  const g = (packed >>> 16) & 0xff
  const b = (packed >>> 8) & 0xff
  const a = (packed & 0xff) / 255

  return a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${round(a)})`
}

const round = (n: number): number => Math.round(n * 1000) / 1000
