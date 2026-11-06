import { toCSSColor } from './color'
import { toUnit } from './units'

type Offset = { width?: unknown; height?: unknown }

const offsetOf = (value: unknown): { x: number; y: number } => {
  const o = (value ?? {}) as Offset
  return {
    x: typeof o.width === 'number' ? o.width : 0,
    y: typeof o.height === 'number' ? o.height : 0,
  }
}

// The deprecated shadowColor/shadowOffset/shadowOpacity/shadowRadius props.
export const legacyBoxShadow = (style: Record<string, unknown>): string | undefined => {
  const { x, y } = offsetOf(style['shadowOffset'])
  const radius = typeof style['shadowRadius'] === 'number' ? style['shadowRadius'] : 0
  const opacity = typeof style['shadowOpacity'] === 'number' ? style['shadowOpacity'] : 1
  const color = toCSSColor(style['shadowColor'] ?? 'black')
  if (color === undefined) return undefined
  return `${x}px ${y}px ${radius}px ${withOpacity(color, opacity)}`
}

export const toCSSTextShadow = (style: Record<string, unknown>): string | undefined => {
  const { x, y } = offsetOf(style['textShadowOffset'])
  const radius = typeof style['textShadowRadius'] === 'number' ? style['textShadowRadius'] : 0
  const color = toCSSColor(style['textShadowColor'] ?? 'black')
  if (color === undefined) return undefined
  return `${x}px ${y}px ${radius}px ${color}`
}

type BoxShadowValue = {
  offsetX: unknown
  offsetY: unknown
  blurRadius?: unknown
  spreadDistance?: unknown
  color?: unknown
  inset?: unknown
}

export const toCSSBoxShadow = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return undefined
  const shadows = (value as BoxShadowValue[]).map((s) => {
    const parts = [
      toUnit(s.offsetX, 'px'),
      toUnit(s.offsetY, 'px'),
      toUnit(s.blurRadius ?? 0, 'px'),
      toUnit(s.spreadDistance ?? 0, 'px'),
      toCSSColor(s.color ?? 'black') ?? 'black',
    ]
    if (s.inset === true) parts.push('inset')
    return parts.join(' ')
  })
  return shadows.length === 0 ? 'none' : shadows.join(', ')
}

const lengthFilters = new Set(['blur'])
const angleFilters = new Set(['hueRotate'])

export const toCSSFilter = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return undefined
  const parts: string[] = []
  for (const entry of value as ReadonlyArray<Record<string, unknown>>) {
    for (const [name, raw] of Object.entries(entry)) {
      const css = toFilterFunction(name, raw)
      if (css !== undefined) parts.push(css)
    }
  }
  return parts.length === 0 ? 'none' : parts.join(' ')
}

const toFilterFunction = (name: string, raw: unknown): string | undefined => {
  if (name === 'dropShadow') {
    const shadow = typeof raw === 'string' ? raw : dropShadow(raw as Record<string, unknown>)
    return shadow === undefined ? undefined : `drop-shadow(${shadow})`
  }
  const cssName = name === 'hueRotate' ? 'hue-rotate' : name
  if (typeof raw === 'number') {
    if (lengthFilters.has(name)) return `${cssName}(${raw}px)`
    if (angleFilters.has(name)) return `${cssName}(${raw}deg)`
    return `${cssName}(${raw})`
  }
  if (typeof raw === 'string') return `${cssName}(${raw})`
  return undefined
}

const dropShadow = (v: Record<string, unknown>): string | undefined => {
  const color = toCSSColor(v['color'] ?? 'black')
  if (color === undefined) return undefined
  return [
    toUnit(v['offsetX'] ?? 0, 'px'),
    toUnit(v['offsetY'] ?? 0, 'px'),
    toUnit(v['standardDeviation'] ?? 0, 'px'),
    color,
  ].join(' ')
}

const withOpacity = (color: string, opacity: number): string => {
  if (opacity >= 1) return color
  const match = /^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/.exec(color)
  if (match === null) return color
  const alpha = match[4] === undefined ? 1 : Number(match[4])
  const a = Math.round(alpha * opacity * 1000) / 1000
  return `rgba(${match[1]},${match[2]},${match[3]},${a})`
}
