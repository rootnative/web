/**
 * @license MIT
 * A port of `Lists/CellRenderMask.js` of `@react-native/virtualized-lists` 0.88.1, Copyright (c)
 * Meta Platforms, Inc. and affiliates.
 */

import { invariant } from '../../utils/invariant'
import type { CellRange } from './types'

export type CellRegion = { first: number; last: number; isSpacer: boolean }

// The cells of a list in sorted regions: each region renders its cells, or is one spacer.
export class CellRenderMask {
  private readonly cellCount: number
  private readonly regions: CellRegion[]

  constructor(numCells: number) {
    invariant(numCells >= 0, 'CellRenderMask must contain a non-negative number of cells')
    this.cellCount = numCells
    this.regions = numCells === 0 ? [] : [{ first: 0, last: numCells - 1, isSpacer: true }]
  }

  enumerateRegions(): readonly CellRegion[] {
    return this.regions
  }

  addCells(cells: CellRange): void {
    invariant(
      cells.first >= 0 &&
        cells.first < this.cellCount &&
        cells.last >= -1 &&
        cells.last < this.cellCount &&
        cells.last >= cells.first - 1,
      'CellRenderMask.addCells called with invalid cell range',
    )
    if (cells.last < cells.first) return

    const [firstIntersect, firstIntersectIndex] = this.findRegion(cells.first)
    const [lastIntersect, lastIntersectIndex] = this.findRegion(cells.last)
    if (firstIntersectIndex === lastIntersectIndex && !firstIntersect.isSpacer) return

    // Replace the covered regions with one to three: a part of a spacer on each side stays.
    const newLeadRegion: CellRegion[] = []
    const newTailRegion: CellRegion[] = []
    const newMainRegion: CellRegion = { first: cells.first, last: cells.last, isSpacer: false }

    if (firstIntersect.first < newMainRegion.first) {
      if (firstIntersect.isSpacer) {
        newLeadRegion.push({
          first: firstIntersect.first,
          last: newMainRegion.first - 1,
          isSpacer: true,
        })
      } else {
        newMainRegion.first = firstIntersect.first
      }
    }
    if (lastIntersect.last > newMainRegion.last) {
      if (lastIntersect.isSpacer) {
        newTailRegion.push({
          first: newMainRegion.last + 1,
          last: lastIntersect.last,
          isSpacer: true,
        })
      } else {
        newMainRegion.last = lastIntersect.last
      }
    }

    this.regions.splice(
      firstIntersectIndex,
      lastIntersectIndex - firstIntersectIndex + 1,
      ...newLeadRegion,
      newMainRegion,
      ...newTailRegion,
    )
  }

  numCells(): number {
    return this.cellCount
  }

  equals(other: CellRenderMask): boolean {
    return (
      this.cellCount === other.cellCount &&
      this.regions.length === other.regions.length &&
      this.regions.every((region, index) => {
        const otherRegion = other.regions[index]
        return (
          otherRegion !== undefined &&
          region.first === otherRegion.first &&
          region.last === otherRegion.last &&
          region.isSpacer === otherRegion.isSpacer
        )
      })
    )
  }

  private findRegion(cellIndex: number): [CellRegion, number] {
    let firstIndex = 0
    let lastIndex = this.regions.length - 1
    while (firstIndex <= lastIndex) {
      const middleIndex = Math.floor((firstIndex + lastIndex) / 2)
      const middleRegion = this.regions[middleIndex]
      if (middleRegion === undefined) break
      if (cellIndex >= middleRegion.first && cellIndex <= middleRegion.last) {
        return [middleRegion, middleIndex]
      }
      if (cellIndex < middleRegion.first) lastIndex = middleIndex - 1
      else firstIndex = middleIndex + 1
    }
    invariant(false, `A region was not found containing cellIdx ${cellIndex}`)
  }
}
