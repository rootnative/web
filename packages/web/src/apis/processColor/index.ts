import normalizeColor from '@react-native/normalize-colors'

export type ProcessedColorValue = number

// A color as React Native's native side takes it: an unsigned 32-bit ARGB
// integer, as on iOS. `null` for an invalid color, `undefined` for none.
export const processColor = (color: unknown): ProcessedColorValue | null | undefined => {
  if (color === undefined || color === null) return color
  if (typeof color !== 'string' && typeof color !== 'number') return null
  const rgba = normalizeColor(color)
  if (rgba === null || rgba === undefined) return null
  return ((rgba << 24) | (rgba >>> 8)) >>> 0
}
