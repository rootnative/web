export const toUnit = (value: unknown, unit: string): string => {
  if (typeof value === 'number') return value === 0 ? '0' : `${value}${unit}`
  return String(value)
}

export const unitlessProperties: ReadonlySet<string> = new Set([
  'aspectRatio',
  'flex',
  'flexGrow',
  'flexShrink',
  'fontWeight',
  'opacity',
  'zIndex',
  'scale',
  'shadowOpacity',
])
