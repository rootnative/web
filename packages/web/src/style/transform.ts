import { toUnit } from './units'

const lengthFunctions = new Set(['translateX', 'translateY', 'translateZ', 'perspective'])

export const toCSSTransform = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return undefined

  const parts: string[] = []
  for (const entry of value as ReadonlyArray<unknown>) {
    if (entry === null || typeof entry !== 'object') continue
    for (const [name, raw] of Object.entries(entry as Record<string, unknown>)) {
      const css = toTransformFunction(name, raw)
      if (css !== undefined) parts.push(css)
    }
  }
  return parts.length === 0 ? 'none' : parts.join(' ')
}

const toTransformFunction = (name: string, raw: unknown): string | undefined => {
  if (name === 'matrix' && Array.isArray(raw)) {
    const fn = raw.length === 16 ? 'matrix3d' : 'matrix'
    return `${fn}(${(raw as number[]).join(',')})`
  }
  if (name === 'translate' && Array.isArray(raw)) {
    return `translate(${(raw as unknown[]).map((v) => toUnit(v, 'px')).join(',')})`
  }
  if (typeof raw === 'number') {
    return lengthFunctions.has(name) ? `${name}(${raw}px)` : `${name}(${raw})`
  }
  if (typeof raw === 'string') return `${name}(${raw})`
  return undefined
}

export const toCSSTransformOrigin = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return undefined
  return (value as unknown[]).map((v) => toUnit(v, 'px')).join(' ')
}
