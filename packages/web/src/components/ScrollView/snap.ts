export type SnapAlignment = 'start' | 'center' | 'end'

export type SnapConfig = {
  // Explicit offsets. Win over the interval.
  offsets: ReadonlyArray<number> | undefined
  // One snap point every `interval` pixels. Paging is the viewport size.
  interval: number | undefined
  alignment: SnapAlignment
  // With offsets: the start and the end of the content count as snap points.
  snapToStart: boolean
  snapToEnd: boolean
}

const nearest = (offset: number, candidates: ReadonlyArray<number>): number | undefined => {
  let best: number | undefined
  let distance = Infinity
  for (const candidate of candidates) {
    const d = Math.abs(candidate - offset)
    if (d < distance) {
      distance = d
      best = candidate
    }
  }
  return best
}

// The distance from an item's start to the viewport's start at rest.
const alignmentShift = (viewport: number, interval: number, alignment: SnapAlignment): number =>
  alignment === 'center' ? (viewport - interval) / 2 : alignment === 'end' ? viewport - interval : 0

// Where the scroll position should settle, or undefined when it should stay.
export const snapTarget = (
  offset: number,
  viewport: number,
  contentSize: number,
  config: SnapConfig,
): number | undefined => {
  const max = Math.max(0, contentSize - viewport)
  let target: number | undefined

  if (config.offsets !== undefined) {
    if (config.offsets.length === 0) return undefined
    const first = Math.min(...config.offsets)
    const last = Math.max(...config.offsets)
    if (!config.snapToStart && offset < first) return undefined
    if (!config.snapToEnd && offset > last) return undefined
    const candidates = [...config.offsets]
    if (config.snapToStart) candidates.push(0)
    if (config.snapToEnd) candidates.push(max)
    target = nearest(offset, candidates)
  } else if (config.interval !== undefined && config.interval > 0) {
    const { interval } = config
    const shift = alignmentShift(viewport, interval, config.alignment)
    const index = Math.round((offset + shift) / interval)
    target = index * interval - shift
  }

  if (target === undefined) return undefined
  target = Math.min(max, Math.max(0, target))
  return Math.abs(target - offset) < 0.5 ? undefined : target
}

// Each offset where the scroll can rest, the same as the targets of snapTarget, sorted. At most
// `limit` on each side of `around`, so a long list doesn't need an element for each one. Empty when
// nothing snaps, and with offsets when the start or the end is free: the browser's scroll snap
// can't leave a part of the content free.
export const snapPositions = (
  around: number,
  viewport: number,
  contentSize: number,
  config: SnapConfig,
  limit: number,
): number[] => {
  const max = Math.max(0, contentSize - viewport)
  if (max === 0) return []
  const clamp = (value: number): number => Math.min(max, Math.max(0, value))

  let candidates: number[]
  if (config.offsets !== undefined) {
    if (config.offsets.length === 0 || !config.snapToStart || !config.snapToEnd) return []
    candidates = [...config.offsets, 0, max].map(clamp)
  } else if (config.interval !== undefined && config.interval > 0) {
    const { interval } = config
    const shift = alignmentShift(viewport, interval, config.alignment)
    // The items that snapTarget picks for an offset from 0 to max.
    const first = Math.round(shift / interval)
    const last = Math.round((max + shift) / interval)
    const center = Math.round((around + shift) / interval)
    candidates = []
    const end = Math.min(last, center + limit)
    for (let index = Math.max(first, center - limit); index <= end; index++) {
      candidates.push(clamp(index * interval - shift))
    }
  } else {
    return []
  }

  const sorted = [...new Set(candidates)]
  sorted.sort((a, b) => a - b)
  let next = sorted.findIndex((position) => position >= around)
  if (next === -1) next = sorted.length
  return sorted.slice(Math.max(0, next - limit), next + limit)
}
