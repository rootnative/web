/**
 * @license MIT
 * A port of `Lists/VirtualizeUtils.js` of `@react-native/virtualized-lists` 0.88.1, Copyright (c)
 * Meta Platforms, Inc. and affiliates.
 */

import type { CellMetricProps, CellMetricsSource, CellRange } from './types'

export type WindowScrollMetrics = {
  offset: number
  velocity: number
  visibleLength: number
  zoomScale?: number | undefined
}

// For each offset, the index of the first cell that holds it, or `undefined`. The start of the
// first cell is inclusive, the start of each other cell is exclusive.
export const elementsThatOverlapOffsets = <ItemT, DataT>(
  offsets: readonly number[],
  props: CellMetricProps<ItemT, DataT>,
  listMetrics: CellMetricsSource,
  zoomScale = 1,
): Array<number | undefined> => {
  const itemCount = props.getItemCount(props.data)
  const result: Array<number | undefined> = []
  for (const [offsetIndex, currentOffset] of offsets.entries()) {
    let left = 0
    let right = itemCount - 1
    while (left <= right) {
      const mid = left + Math.floor((right - left) / 2)
      const frame = listMetrics.getCellMetricsApprox(mid, props)
      const scaledOffsetStart = frame.offset * zoomScale
      const scaledOffsetEnd = (frame.offset + frame.length) * zoomScale
      if (
        (mid === 0 && currentOffset < scaledOffsetStart) ||
        (mid !== 0 && currentOffset <= scaledOffsetStart)
      ) {
        right = mid - 1
      } else if (currentOffset > scaledOffsetEnd) {
        left = mid + 1
      } else {
        result[offsetIndex] = mid
        break
      }
    }
  }
  return result
}

// The number of cells in `next` that aren't in `prev`.
export const newRangeCount = (prev: CellRange, next: CellRange): number =>
  next.last -
  next.first +
  1 -
  Math.max(0, 1 + Math.min(next.last, prev.last) - Math.max(next.first, prev.first))

// The cells to render: the visible ones, then the overscan area before and after them, biased in
// the direction of the scroll. Each call adds at most `maxToRenderPerBatch` new cells, so the
// visible area fills first.
export const computeWindowedRenderLimits = <ItemT, DataT>(
  props: CellMetricProps<ItemT, DataT>,
  maxToRenderPerBatch: number,
  windowSize: number,
  prev: CellRange,
  listMetrics: CellMetricsSource,
  scrollMetrics: WindowScrollMetrics,
): CellRange => {
  const itemCount = props.getItemCount(props.data)
  if (itemCount === 0) return { first: 0, last: -1 }
  const { offset, velocity, visibleLength, zoomScale = 1 } = scrollMetrics

  const visibleBegin = Math.max(0, offset)
  const visibleEnd = visibleBegin + visibleLength
  const overscanLength = (windowSize - 1) * visibleLength
  // React Native keeps the overscan centered: a lead from the velocity made more churn.
  const leadFactor = 0.5
  const fillPreference = velocity > 1 ? 'after' : velocity < -1 ? 'before' : 'none'
  const overscanBegin = Math.max(0, visibleBegin - (1 - leadFactor) * overscanLength)
  const overscanEnd = Math.max(0, visibleEnd + leadFactor * overscanLength)

  const lastItemOffset = listMetrics.getCellMetricsApprox(itemCount - 1, props).offset * zoomScale
  if (lastItemOffset < overscanBegin) {
    return { first: Math.max(0, itemCount - 1 - maxToRenderPerBatch), last: itemCount - 1 }
  }

  const overlaps = elementsThatOverlapOffsets(
    [overscanBegin, visibleBegin, visibleEnd, overscanEnd],
    props,
    listMetrics,
    zoomScale,
  )
  const overscanFirst = overlaps[0] ?? 0
  let first = overlaps[1] ?? Math.max(0, overscanFirst)
  const overscanLast = overlaps[3] ?? itemCount - 1
  let last = overlaps[2] ?? Math.min(overscanLast, first + maxToRenderPerBatch - 1)
  const visible = { first, last }

  let newCellCount = newRangeCount(prev, visible)
  while (first > overscanFirst || last < overscanLast) {
    const maxNewCells = newCellCount >= maxToRenderPerBatch
    // React Native 0.88.1 keeps the flag `fixVirtualizeListCollapseWindowSize` off. These two
    // lines are the code that runs with the flag off.
    const firstWillAddMore = first <= prev.first || first > prev.last
    const lastWillAddMore = last >= prev.last || last < prev.first
    const firstShouldIncrement = first > overscanFirst && (!maxNewCells || !firstWillAddMore)
    const lastShouldIncrement = last < overscanLast && (!maxNewCells || !lastWillAddMore)
    // Stop only when no side can grow with no new cell. This keeps as many rendered cells as
    // possible.
    if (maxNewCells && !firstShouldIncrement && !lastShouldIncrement) break
    if (
      firstShouldIncrement &&
      !(fillPreference === 'after' && lastShouldIncrement && lastWillAddMore)
    ) {
      if (firstWillAddMore) newCellCount++
      first--
    }
    if (
      lastShouldIncrement &&
      !(fillPreference === 'before' && firstShouldIncrement && firstWillAddMore)
    ) {
      if (lastWillAddMore) newCellCount++
      last++
    }
  }
  if (!(
    last >= first &&
    first >= 0 &&
    last < itemCount &&
    first >= overscanFirst &&
    last <= overscanLast &&
    first <= visible.first &&
    last >= visible.last
  )) {
    throw new Error(
      `Bad window calculation ${JSON.stringify({ first, last, itemCount, overscanFirst, overscanLast, visible })}`,
    )
  }
  return { first, last }
}

// React Native's default: `key`, then `id`, then the index. The key is always a string, as in
// `FlatList`; React Native returns `key` and `id` as they are.
export const keyExtractor = (item: unknown, index: number): string => {
  if (typeof item === 'object' && item !== null) {
    const record = item as { key?: unknown; id?: unknown }
    if (record.key != null) return String(record.key)
    if (record.id != null) return String(record.id)
  }
  return String(index)
}
