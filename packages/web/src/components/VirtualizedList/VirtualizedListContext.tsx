/**
 * @license MIT
 * A port of `Lists/VirtualizedListContext.js` of `@react-native/virtualized-lists` 0.88.1,
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 */

import {
  createContext,
  useContext,
  useMemo,
  type Context,
  type ReactElement,
  type ReactNode,
} from 'react'

import type { ScrollEvent } from '../ScrollView/types'

export type NestedScrollMetrics = { offset: number; visibleLength: number }

// What a list calls on a list in one of its cells, of the same direction.
export type ChildList = {
  hasMore: () => boolean
  recordInteraction: () => void
  measureLayoutRelativeToContainingList: () => void
  handleScroll: (event: ScrollEvent) => void
  handleScrollBeginDrag: (event: ScrollEvent) => void
  handleScrollEndDrag: (event: ScrollEvent) => void
  handleMomentumScrollBegin: (event: ScrollEvent) => void
  handleMomentumScrollEnd: (event: ScrollEvent) => void
}

// What a nested list reads from the outermost list of the same direction, which owns the scroller.
export type OutermostList = {
  contentElement: () => HTMLElement | null
  getScrollMetrics: () => NestedScrollMetrics
}

export type VirtualizedListContextValue = Readonly<{
  // The key of the cell that holds the context, or null at the level of the list.
  cellKey: string | null
  horizontal: boolean
  getScrollMetrics: () => NestedScrollMetrics
  getOutermostParentList: () => OutermostList
  registerAsNestedChild: (child: { cellKey: string; list: ChildList }) => void
  unregisterAsNestedChild: (child: { list: ChildList }) => void
}>

export const VirtualizedListContext: Context<VirtualizedListContextValue | null> =
  createContext<VirtualizedListContextValue | null>(null)

// For a component like a Modal: a list inside it isn't nested in a list outside it.
export function VirtualizedListContextResetter({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return <VirtualizedListContext.Provider value={null}>{children}</VirtualizedListContext.Provider>
}

// Sets the key of a cell, for a list in that cell.
export function VirtualizedListCellContextProvider({
  cellKey,
  children,
}: {
  cellKey: string
  children: ReactNode
}): ReactElement {
  const current = useContext(VirtualizedListContext)
  const context = useMemo(
    () => (current == null ? null : { ...current, cellKey }),
    [current, cellKey],
  )
  return (
    <VirtualizedListContext.Provider value={context}>{children}</VirtualizedListContext.Provider>
  )
}
