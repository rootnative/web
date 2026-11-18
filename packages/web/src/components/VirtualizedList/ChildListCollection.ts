/**
 * @license MIT
 * A port of `Lists/ChildListCollection.js` of `@react-native/virtualized-lists` 0.88.1, Copyright
 * (c) Meta Platforms, Inc. and affiliates.
 */

import { invariant } from '../../utils/invariant'

// The nested lists of a list, by the key of the cell that holds each one.
export class ChildListCollection<TList> {
  private readonly cellKeyToChildren = new Map<string, Set<TList>>()
  private readonly childrenToCellKey = new Map<TList, string>()

  add(list: TList, cellKey: string): void {
    invariant(!this.childrenToCellKey.has(list), 'Trying to add already present child list')
    const cellLists = this.cellKeyToChildren.get(cellKey) ?? new Set()
    cellLists.add(list)
    this.cellKeyToChildren.set(cellKey, cellLists)
    this.childrenToCellKey.set(list, cellKey)
  }

  remove(list: TList): void {
    const cellKey = this.childrenToCellKey.get(list)
    invariant(cellKey != null, 'Trying to remove non-present child list')
    this.childrenToCellKey.delete(list)
    const cellLists = this.cellKeyToChildren.get(cellKey)
    invariant(cellLists, '_cellKeyToChildren should contain cellKey')
    cellLists.delete(list)
    if (cellLists.size === 0) this.cellKeyToChildren.delete(cellKey)
  }

  forEach(fn: (list: TList) => void): void {
    for (const listSet of this.cellKeyToChildren.values()) {
      for (const list of listSet) fn(list)
    }
  }

  forEachInCell(cellKey: string, fn: (list: TList) => void): void {
    for (const list of this.cellKeyToChildren.get(cellKey) ?? []) fn(list)
  }

  anyInCell(cellKey: string, fn: (list: TList) => boolean): boolean {
    for (const list of this.cellKeyToChildren.get(cellKey) ?? []) {
      if (fn(list)) return true
    }
    return false
  }

  size(): number {
    return this.childrenToCellKey.size
  }
}
