/**
 * @license MIT
 * A port of `Lists/ListMetricsAggregator.js` of `@react-native/virtualized-lists` 0.88.1,
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 */

import { invariant } from '../../utils/invariant'
import type { LayoutRectangle } from '../View/types'
import type { CellMetricProps, CellMetrics, CellMetricsSource, ListOrientation } from './types'
import { keyExtractor as defaultKeyExtractor } from './VirtualizeUtils'

type Size = { readonly width: number; readonly height: number }

const NO_CONTENT_LENGTH =
  'ListMetricsAggregator must be notified of list content layout before resolving offsets'

// The measured cells of a list, by key, and estimates for the cells that have no measure.
export class ListMetricsAggregator implements CellMetricsSource {
  private averageCellLength = 0
  private readonly cellMetrics = new Map<string, CellMetrics>()
  private contentLength: number | undefined
  private highestMeasuredCellIndex = 0
  private measuredCellsLength = 0
  private measuredCellsCount = 0
  private orientation: ListOrientation = { horizontal: false, rtl: false }

  // Returns true when the layout of the cell changed since the last call.
  notifyCellLayout({
    cellIndex,
    cellKey,
    orientation,
    layout,
  }: {
    cellIndex: number
    cellKey: string
    orientation: ListOrientation
    layout: LayoutRectangle
  }): boolean {
    this.invalidateIfOrientationChanged(orientation)
    const next: CellMetrics = {
      index: cellIndex,
      length: this.selectLength(layout),
      isMounted: true,
      offset: this.flowRelativeOffset(layout),
    }
    const curr = this.cellMetrics.get(cellKey)
    if (curr && next.offset === curr.offset && next.length === curr.length) {
      curr.isMounted = true
      return false
    }
    if (curr) {
      this.measuredCellsLength += next.length - curr.length
    } else {
      this.measuredCellsLength += next.length
      this.measuredCellsCount += 1
    }
    // A new cell counts first, so the count isn't 0 here. The guard stays in case a later change
    // resets the count and keeps the old metrics.
    this.averageCellLength =
      this.measuredCellsCount > 0 ? this.measuredCellsLength / this.measuredCellsCount : 0
    this.cellMetrics.set(cellKey, next)
    this.highestMeasuredCellIndex = Math.max(this.highestMeasuredCellIndex, cellIndex)
    return true
  }

  notifyCellUnmounted(cellKey: string): void {
    const curr = this.cellMetrics.get(cellKey)
    if (curr) curr.isMounted = false
  }

  notifyListContentLayout({
    orientation,
    layout,
  }: {
    orientation: ListOrientation
    layout: Size
  }): void {
    this.invalidateIfOrientationChanged(orientation)
    this.contentLength = this.selectLength(layout)
  }

  getAverageCellLength(): number {
    return this.averageCellLength
  }

  // 0 when no cell has a measure.
  getHighestMeasuredCellIndex(): number {
    return this.highestMeasuredCellIndex
  }

  // The measure of the cell, else an estimate from the average length of the measured cells.
  getCellMetricsApprox<ItemT, DataT>(
    index: number,
    props: CellMetricProps<ItemT, DataT>,
  ): CellMetrics {
    const frame = this.getCellMetrics(index, props)
    // A frame with another index comes from a row that moved.
    if (frame && frame.index === index) return frame

    let offset: number | undefined
    const highestMeasuredCellIndex = this.getHighestMeasuredCellIndex()
    if (highestMeasuredCellIndex < index) {
      // Start from the last measured cell, so a list header counts in the offset.
      const highestMeasuredCellFrame = this.getCellMetrics(highestMeasuredCellIndex, props)
      if (highestMeasuredCellFrame) {
        offset =
          highestMeasuredCellFrame.offset +
          highestMeasuredCellFrame.length +
          this.averageCellLength * (index - highestMeasuredCellIndex - 1)
      }
    }
    offset ??= this.averageCellLength * index

    invariant(
      index >= 0 && index < props.getItemCount(props.data),
      `Tried to get frame for out of range index ${index}`,
    )
    return { length: this.averageCellLength, offset, index, isMounted: false }
  }

  // The measure of the cell, or its `getItemLayout`, or `undefined`.
  getCellMetrics<ItemT, DataT>(
    index: number,
    props: CellMetricProps<ItemT, DataT>,
  ): CellMetrics | undefined {
    const { data, getItem, getItemCount, getItemLayout } = props
    invariant(
      index >= 0 && index < getItemCount(data),
      `Tried to get metrics for out of range cell index ${index}`,
    )
    const keyExtractor = props.keyExtractor ?? defaultKeyExtractor
    const frame = this.cellMetrics.get(keyExtractor(getItem(data, index), index))
    if (frame && frame.index === index) return frame
    if (getItemLayout) {
      const { length, offset } = getItemLayout(data, index)
      return { index, length, offset, isMounted: true }
    }
    return undefined
  }

  // Takes a fractional index too: 1.5 is the middle of cell 1.
  getCellOffsetApprox<ItemT, DataT>(index: number, props: CellMetricProps<ItemT, DataT>): number {
    if (Number.isInteger(index)) return this.getCellMetricsApprox(index, props).offset
    const frameMetrics = this.getCellMetricsApprox(Math.floor(index), props)
    return frameMetrics.offset + (index - Math.floor(index)) * frameMetrics.length
  }

  getContentLength(): number {
    return this.contentLength ?? 0
  }

  hasContentLength(): boolean {
    return this.contentLength !== undefined
  }

  // The offset from the start of the flow: from the left in a left-to-right list, from the right
  // in a horizontal right-to-left list.
  flowRelativeOffset(layout: LayoutRectangle, referenceContentLength?: number | null): number {
    const { horizontal, rtl } = this.orientation
    if (!(horizontal && rtl)) return this.selectOffset(layout)
    const contentLength = referenceContentLength ?? this.contentLength
    invariant(contentLength != null, NO_CONTENT_LENGTH)
    return contentLength - (this.selectOffset(layout) + this.selectLength(layout))
  }

  cartesianOffset(flowRelativeOffset: number): number {
    const { horizontal, rtl } = this.orientation
    if (!(horizontal && rtl)) return flowRelativeOffset
    invariant(this.contentLength !== undefined, NO_CONTENT_LENGTH)
    return this.contentLength - flowRelativeOffset
  }

  private invalidateIfOrientationChanged(orientation: ListOrientation): void {
    if (orientation.rtl !== this.orientation.rtl) this.cellMetrics.clear()
    if (orientation.horizontal !== this.orientation.horizontal) {
      this.cellMetrics.clear()
      this.averageCellLength = 0
      this.contentLength = undefined
      this.highestMeasuredCellIndex = 0
      this.measuredCellsLength = 0
      this.measuredCellsCount = 0
    }
    this.orientation = orientation
  }

  private selectLength({ width, height }: Size): number {
    return this.orientation.horizontal ? width : height
  }

  private selectOffset({ x, y }: { readonly x: number; readonly y: number }): number {
    return this.orientation.horizontal ? x : y
  }
}
