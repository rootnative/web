import type { ViewabilityConfig, ViewableItemsChangedInfo, ViewToken } from './types'

export type CellMetrics = { offset: number; length: number }

export type MetricsAt = (index: number) => CellMetrics | undefined

const pixelsVisible = (top: number, bottom: number, viewport: number): number =>
  Math.max(0, Math.min(bottom, viewport) - Math.max(top, 0))

const isEntirelyVisible = (top: number, bottom: number, viewport: number): boolean =>
  top >= 0 && bottom <= viewport && bottom > top

const isViewable = (
  viewAreaMode: boolean,
  threshold: number,
  top: number,
  bottom: number,
  viewport: number,
  length: number,
): boolean => {
  if (isEntirelyVisible(top, bottom, viewport)) return true
  const pixels = pixelsVisible(top, bottom, viewport)
  const percent = 100 * (viewAreaMode ? pixels / viewport : pixels / length)
  return percent >= threshold
}

// The item indices that the config counts as viewable, in order. The same
// math as React Native's ViewabilityHelper: an item is viewable when it is
// entirely visible, or when its visible part reaches the threshold.
export const computeViewableIndices = (
  itemCount: number,
  metricsAt: MetricsAt,
  scrollOffset: number,
  viewport: number,
  config: ViewabilityConfig,
): number[] => {
  const { itemVisiblePercentThreshold, viewAreaCoveragePercentThreshold } = config
  const viewAreaMode = viewAreaCoveragePercentThreshold != null
  const threshold = viewAreaMode ? viewAreaCoveragePercentThreshold : itemVisiblePercentThreshold
  if (threshold == null || viewAreaMode === (itemVisiblePercentThreshold != null)) {
    throw new Error(
      'Must set exactly one of itemVisiblePercentThreshold or viewAreaCoveragePercentThreshold',
    )
  }

  const viewable: number[] = []
  let firstVisible = -1
  for (let index = 0; index < itemCount; index++) {
    const metrics = metricsAt(index)
    if (metrics === undefined) continue
    const top = Math.floor(metrics.offset - scrollOffset)
    const bottom = Math.floor(top + metrics.length)
    if (top < viewport && bottom > 0) {
      firstVisible = index
      if (isViewable(viewAreaMode, threshold, top, bottom, viewport, metrics.length)) {
        viewable.push(index)
      }
    } else if (firstVisible >= 0) {
      break
    }
  }
  return viewable
}

const sameIndices = (a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index])

export type CreateViewToken<ItemT> = (index: number, isViewable: boolean) => ViewToken<ItemT>

// One tracker per viewability config. It remembers the viewable set and
// reports only the change, after `minimumViewTime` when the config has one.
export class ViewabilityTracker<ItemT> {
  readonly config: ViewabilityConfig
  private interacted = false
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private viewableIndices: number[] = []
  private viewableItems = new Map<string, ViewToken<ItemT>>()

  constructor(config: ViewabilityConfig = { viewAreaCoveragePercentThreshold: 0 }) {
    this.config = config
  }

  dispose(): void {
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
  }

  recordInteraction(): void {
    this.interacted = true
  }

  resetViewableIndices(): void {
    this.viewableIndices = []
  }

  onUpdate(
    itemCount: number,
    metricsAt: MetricsAt,
    scrollOffset: number,
    viewport: number,
    createViewToken: CreateViewToken<ItemT>,
    onViewableItemsChanged: (info: ViewableItemsChangedInfo<ItemT>) => void,
  ): void {
    if ((this.config.waitForInteraction === true && !this.interacted) || itemCount === 0) return
    if (metricsAt(0) === undefined) return

    const next = computeViewableIndices(itemCount, metricsAt, scrollOffset, viewport, this.config)
    if (sameIndices(this.viewableIndices, next)) return
    this.viewableIndices = next

    const { minimumViewTime } = this.config
    if (minimumViewTime !== undefined && minimumViewTime > 0) {
      const timer = setTimeout(() => {
        this.timers.delete(timer)
        if (this.viewableIndices !== next) return
        this.report(next, createViewToken, onViewableItemsChanged)
      }, minimumViewTime)
      this.timers.add(timer)
    } else {
      this.report(next, createViewToken, onViewableItemsChanged)
    }
  }

  private report(
    indices: number[],
    createViewToken: CreateViewToken<ItemT>,
    onViewableItemsChanged: (info: ViewableItemsChangedInfo<ItemT>) => void,
  ): void {
    const previous = this.viewableItems
    const next = new Map<string, ViewToken<ItemT>>()
    for (const index of indices) {
      const token = createViewToken(index, true)
      next.set(token.key, token)
    }

    const changed: Array<ViewToken<ItemT>> = []
    for (const [key, token] of next) {
      if (!previous.has(key)) changed.push(token)
    }
    for (const [key, token] of previous) {
      if (!next.has(key)) changed.push({ ...token, isViewable: false })
    }
    if (changed.length === 0) return

    this.viewableItems = next
    onViewableItemsChanged({ viewableItems: Array.from(next.values()), changed })
  }
}
