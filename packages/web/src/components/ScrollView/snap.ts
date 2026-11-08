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
    const { interval, alignment } = config
    // The distance from an item's start to the viewport's start at rest.
    const shift =
      alignment === 'center'
        ? (viewport - interval) / 2
        : alignment === 'end'
          ? viewport - interval
          : 0
    const index = Math.round((offset + shift) / interval)
    target = index * interval - shift
  }

  if (target === undefined) return undefined
  target = Math.min(max, Math.max(0, target))
  return Math.abs(target - offset) < 0.5 ? undefined : target
}
