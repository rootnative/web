/**
 * @license MIT
 * A port of `Lists/VirtualizedList.js` of `@react-native/virtualized-lists` 0.88.1, Copyright (c)
 * Meta Platforms, Inc. and affiliates.
 */

import {
  cloneElement,
  Fragment,
  isValidElement,
  useImperativeHandle,
  useLayoutEffect,
  useState,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react'

import { StyleSheet } from '../../apis/StyleSheet'
import type { ViewStyle } from '../../apis/StyleSheet/types'
import type { StyleProp } from '../../style/types'
import { isProductionEnv } from '../../utils/env'
import { invariant } from '../../utils/invariant'
import { warnOnce } from '../../utils/warn'
import { RefreshControl } from '../RefreshControl'
import { ScrollView } from '../ScrollView'
import type { ScrollEvent, ScrollViewInstance, ScrollViewProps } from '../ScrollView/types'
import { View } from '../View'
import type { LayoutChangeEvent, LayoutRectangle } from '../View/types'
import {
  CellRenderer,
  horizontallyInvertedStyle,
  verticallyInvertedStyle,
  type SeparatorUpdaters,
} from './CellRenderer'
import { CellRenderMask } from './CellRenderMask'
import { ListMetricsAggregator } from './ListMetricsAggregator'
import type {
  CellMetricProps,
  CellMetrics,
  CellRange,
  ListComponent,
  ListOrientation,
  ScrollToIndexParams,
  ScrollToItemParams,
  ScrollToOffsetParams,
  ViewableItemsChangedInfo,
  ViewToken,
  VirtualizedListInstance,
  VirtualizedListProps,
} from './types'
import { ViewabilityTracker } from './viewability'
import { computeWindowedRenderLimits, keyExtractor as defaultKeyExtractor } from './VirtualizeUtils'

export type { VirtualizedListInstance, VirtualizedListProps } from './types'

const ON_EDGE_REACHED_EPSILON = 0.001
// With no threshold prop, the edge events use 2 px, and the render priority uses 2 viewports.
const DEFAULT_EDGE_THRESHOLD_PX = 2
const DEFAULT_EDGE_THRESHOLD_VIEWPORTS = 2
const DEFAULT_INITIAL_NUM_TO_RENDER = 10
const DEFAULT_MAX_TO_RENDER_PER_BATCH = 10
const DEFAULT_WINDOW_SIZE = 21
const DEFAULT_UPDATE_CELLS_BATCHING_PERIOD = 50

// Inline, not a View style: the length changes on each window update, and each new value of a
// View style adds a rule to the style sheet.
const spacerStyle = (horizontal: boolean, length: number) =>
  horizontal ? { width: length, flexShrink: 0 } : { height: length, flexShrink: 0 }

const clamp = (min: number, value: number, max: number): number =>
  value < min ? min : value > max ? max : value

type ListProps<ItemT> = VirtualizedListProps<ItemT> & CellMetricProps<ItemT, unknown>

type ListState = {
  cellsAroundViewport: CellRange
  renderMask: CellRenderMask
  // Above 0, the scroll metrics are stale: the list waits for the scroll event of its initial
  // scroll.
  pendingScrollUpdateCount: number
}

type ScrollMetrics = {
  crossAxisLength: number
  dOffset: number
  dt: number
  offset: number
  timestamp: number
  velocity: number
  visibleLength: number
  zoomScale: number
}

const resolveProps = <ItemT,>(props: VirtualizedListProps<ItemT>): ListProps<ItemT> => {
  const { getItem, getItemCount } = props
  invariant(getItemCount != null, 'VirtualizedList: The "getItemCount" prop must be provided')
  invariant(getItem != null, 'VirtualizedList: The "getItem" prop must be provided')
  return { ...props, data: props.data, getItem, getItemCount }
}

const keyOf = <ItemT,>(props: ListProps<ItemT>, item: ItemT, index: number): string =>
  props.keyExtractor != null ? props.keyExtractor(item, index) : defaultKeyExtractor(item, index)

const itemKeyAt = <ItemT,>(props: ListProps<ItemT>, index: number): string =>
  keyOf(props, props.getItem(props.data, index), index)

const initialRenderRegion = <ItemT,>(props: ListProps<ItemT>): CellRange => {
  const itemCount = props.getItemCount(props.data)
  const first = Math.max(0, Math.min(itemCount - 1, Math.floor(props.initialScrollIndex ?? 0)))
  const last =
    Math.min(itemCount, first + (props.initialNumToRender ?? DEFAULT_INITIAL_NUM_TO_RENDER)) - 1
  return { first, last }
}

// A stuck sticky header can sit far from its layout position, so the most recent one before the
// viewport stays rendered.
const ensureClosestStickyHeader = <ItemT,>(
  props: ListProps<ItemT>,
  stickyHeaderIndices: readonly number[],
  renderMask: CellRenderMask,
  cellIndex: number,
): void => {
  const stickyOffset = props.ListHeaderComponent != null ? 1 : 0
  const targetStickyIndex = cellIndex + stickyOffset
  let closestStickyIndex: number | undefined
  for (const stickyIndex of stickyHeaderIndices) {
    if (
      Number.isInteger(stickyIndex) &&
      stickyIndex < targetStickyIndex &&
      stickyIndex >= stickyOffset &&
      (closestStickyIndex === undefined || stickyIndex > closestStickyIndex)
    ) {
      closestStickyIndex = stickyIndex
    }
  }
  if (closestStickyIndex !== undefined) {
    const itemIndex = closestStickyIndex - stickyOffset
    renderMask.addCells({ first: itemIndex, last: itemIndex })
  }
}

const createRenderMask = <ItemT,>(
  props: ListProps<ItemT>,
  cellsAroundViewport: CellRange,
  additionalRegions: readonly CellRange[] = [],
): CellRenderMask => {
  const itemCount = props.getItemCount(props.data)
  invariant(
    cellsAroundViewport.first >= 0 &&
      cellsAroundViewport.last >= cellsAroundViewport.first - 1 &&
      cellsAroundViewport.last < itemCount,
    `Invalid cells around viewport "[${cellsAroundViewport.first}, ${cellsAroundViewport.last}]" was passed to VirtualizedList._createRenderMask`,
  )
  const renderMask = new CellRenderMask(itemCount)
  if (itemCount > 0) {
    for (const region of [cellsAroundViewport, ...additionalRegions]) renderMask.addCells(region)
    // The first cells stay rendered, so a scroll to the top shows them at once.
    if (props.initialScrollIndex == null || props.initialScrollIndex <= 0) {
      renderMask.addCells(initialRenderRegion(props))
    }
    const { stickyHeaderIndices } = props
    if (stickyHeaderIndices != null && stickyHeaderIndices.length > 0) {
      ensureClosestStickyHeader(props, stickyHeaderIndices, renderMask, cellsAroundViewport.first)
    }
  }
  return renderMask
}

const constrainToItemCount = <ItemT,>(cells: CellRange, props: ListProps<ItemT>): CellRange => {
  const lastPossibleCellIndex = props.getItemCount(props.data) - 1
  // A smaller `last` can shrink the window a lot, so `first` moves back to keep one batch.
  const maxToRenderPerBatch = props.maxToRenderPerBatch ?? DEFAULT_MAX_TO_RENDER_PER_BATCH
  const maxFirst = Math.max(0, lastPossibleCellIndex - maxToRenderPerBatch)
  return {
    first: clamp(0, cells.first, maxFirst),
    last: Math.min(lastPossibleCellIndex, cells.last),
  }
}

const initialState = <ItemT,>(props: ListProps<ItemT>): ListState => {
  const region = initialRenderRegion(props)
  return {
    cellsAroundViewport: region,
    renderMask: createRenderMask(props, region),
    pendingScrollUpdateCount:
      props.initialScrollIndex != null && props.initialScrollIndex > 0 ? 1 : 0,
  }
}

// React Native's `getDerivedStateFromProps`: a new item count can make the window stale.
const deriveState = <ItemT,>(props: ListProps<ItemT>, state: ListState): ListState => {
  if (props.getItemCount(props.data) === state.renderMask.numCells()) return state
  const cellsAroundViewport = constrainToItemCount(state.cellsAroundViewport, props)
  return {
    cellsAroundViewport,
    renderMask: createRenderMask(props, cellsAroundViewport),
    pendingScrollUpdateCount: state.pendingScrollUpdateCount,
  }
}

const elementLayout = (element: HTMLElement): LayoutRectangle => ({
  x: element.offsetLeft,
  y: element.offsetTop,
  width: element.offsetWidth,
  height: element.offsetHeight,
})

// The layout top of an element whose previous siblings can be stuck sticky headers.
const staticEnd = (element: HTMLElement): number => {
  const previous = element.previousElementSibling
  const top =
    getComputedStyle(element).position !== 'sticky'
      ? element.offsetTop
      : previous instanceof HTMLElement
        ? staticEnd(previous)
        : 0
  return top + element.offsetHeight
}

// A sticky cell sits in a wrapper of the ScrollView, and a stuck wrapper reports the place where
// it's stuck. The layout offset is the end of the element before the wrapper.
const stickyCellLayout = (element: HTMLElement): LayoutRectangle => {
  const previous = element.parentElement?.previousElementSibling
  return {
    x: 0,
    y: previous instanceof HTMLElement ? staticEnd(previous) : 0,
    width: element.offsetWidth,
    height: element.offsetHeight,
  }
}

const isRightToLeft = (element: HTMLElement): boolean =>
  getComputedStyle(element).direction === 'rtl'

const renderListComponent = (component: ListComponent): ReactNode => {
  if (component == null) return null
  if (isValidElement(component)) return component
  const Component = component
  return <Component />
}

type EmptyElementProps = {
  onLayout?: ((event: LayoutChangeEvent) => void) | undefined
  style?: StyleProp<ViewStyle>
}

const renderEmptyComponent = (
  component: Exclude<ListComponent, null | undefined>,
  inversionStyle: StyleProp<ViewStyle>,
  onLayoutEmpty: (event: LayoutChangeEvent) => void,
): ReactNode => {
  const element = (
    isValidElement(component) ? component : renderListComponent(component)
  ) as ReactElement<EmptyElementProps>
  if (element.type === Fragment) return element
  const own = element.props
  return cloneElement(element, {
    onLayout: (event: LayoutChangeEvent) => {
      onLayoutEmpty(event)
      own.onLayout?.(event)
    },
    style: StyleSheet.compose(inversionStyle, own.style),
  })
}

type TrackerEntry<ItemT> = {
  tracker: ViewabilityTracker<ItemT>
  callback: (
    props: VirtualizedListProps<ItemT>,
  ) => ((info: ViewableItemsChangedInfo<ItemT>) => void) | null | undefined
}

const createTrackers = <ItemT,>(props: VirtualizedListProps<ItemT>): Array<TrackerEntry<ItemT>> => {
  if (props.viewabilityConfigCallbackPairs !== undefined) {
    return props.viewabilityConfigCallbackPairs.map((pair) => ({
      tracker: new ViewabilityTracker<ItemT>(pair.viewabilityConfig),
      callback: () => pair.onViewableItemsChanged,
    }))
  }
  if (props.onViewableItemsChanged != null) {
    return [
      {
        tracker: new ViewabilityTracker<ItemT>(props.viewabilityConfig),
        callback: (latest) => latest.onViewableItemsChanged,
      },
    ]
  }
  return []
}

type MountedCell = { index: number; element: HTMLElement }

const controllers = new WeakMap<object, { cellMetricsApprox: (index: number) => CellMetrics }>()

// The metrics of one cell of a list, from its ref. React Native's VirtualizedSectionList reads them
// through `__getListMetrics()`; the package doesn't export this.
export const cellMetricsApprox = (instance: object, index: number): CellMetrics | undefined =>
  controllers.get(instance)?.cellMetricsApprox(index)

// The fields and methods of React Native's class. React state holds only the window, and a render
// reads the cell metrics from here.
class ListController<ItemT> {
  readonly listMetrics = new ListMetricsAggregator()
  readonly separatorUpdaters: SeparatorUpdaters = new Map()
  readonly instance: VirtualizedListInstance<ItemT>
  private props: ListProps<ItemT>
  private state: ListState
  private committed = false
  private readonly setState: Dispatch<SetStateAction<ListState>>
  private readonly trackers: Array<TrackerEntry<ItemT>>
  private readonly cells = new Map<string, MountedCell>()
  private observer: ResizeObserver | null = null
  private scroller: ScrollViewInstance | null = null
  private scrollMetrics: ScrollMetrics = {
    crossAxisLength: 0,
    dOffset: 0,
    dt: 10,
    offset: 0,
    timestamp: 0,
    velocity: 0,
    visibleLength: 0,
    zoomScale: 1,
  }
  private rtl = false
  private footerLength = 0
  private hasMoreCells = false
  private hasTriggeredInitialScrollToIndex = false
  private hiPriInProgress = false
  private lastFocusedCellKey: string | undefined
  private sentStartForContentLength = 0
  private sentEndForContentLength = 0
  private updateTimeout: ReturnType<typeof setTimeout> | undefined

  constructor(props: ListProps<ItemT>, setState: Dispatch<SetStateAction<ListState>>) {
    this.props = props
    this.state = initialState(props)
    this.setState = setState
    this.trackers = createTrackers(props)
    this.instance = {
      scrollToEnd: (params) => this.scrollToEnd(params),
      scrollToIndex: (params) => this.scrollToIndex(params),
      scrollToItem: (params) => this.scrollToItem(params),
      scrollToOffset: (params) => this.scrollToOffset(params),
      recordInteraction: () => this.recordInteraction(),
      flashScrollIndicators: () => this.scroller?.flashScrollIndicators?.(),
      getScrollResponder: () => {
        const responder = this.scroller?.getScrollResponder
        return typeof responder === 'function' ? responder.call(this.scroller) : null
      },
      getScrollableNode: () => this.scrollableNode(),
      getScrollRef: () => this.scroller,
      setNativeProps: (nativeProps) => this.scroller?.setNativeProps?.(nativeProps),
      hasMore: () => this.hasMoreCells,
    }
    controllers.set(this.instance, this)
  }

  cellMetricsApprox(index: number): CellMetrics {
    return this.listMetrics.getCellMetricsApprox(index, this.props)
  }

  // After each commit. Returns the props of the commit before, if any.
  commit(props: ListProps<ItemT>, state: ListState): ListProps<ItemT> | undefined {
    const previous = this.committed ? this.props : undefined
    this.props = props
    this.state = state
    this.committed = true
    this.hasMoreCells = state.cellsAroundViewport.last < props.getItemCount(props.data) - 1
    return previous
  }

  // React Native's `componentDidUpdate`.
  didUpdate(prevProps: ListProps<ItemT>): void {
    const { data, extraData, getItemLayout } = this.props
    if (data !== prevProps.data || extraData !== prevProps.extraData) {
      for (const entry of this.trackers) entry.tracker.resetViewableIndices()
    }
    // A high-priority update runs once per commit: the commit that it causes schedules the next
    // update with the batching period.
    const hiPriInProgress = this.hiPriInProgress
    this.scheduleCellsToRenderUpdate()
    if (hiPriInProgress) this.hiPriInProgress = false
    // With getItemLayout, a scroll can pass the last rendered cell with no layout change, so the
    // edge check runs again after more cells render.
    if (getItemLayout != null) this.maybeCallOnEdgeReached()
  }

  attach(): void {
    const scroller = this.scrollableNode()
    if (scroller !== null) this.rtl = isRightToLeft(scroller)
    if (this.props.getItemLayout == null && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(this.handleCellsResized)
      for (const cell of this.cells.values()) this.observer.observe(cell.element)
    }
    // The first paint shows the initial scroll index, not the top of the list.
    const { initialScrollIndex } = this.props
    const content = this.contentElement()
    if (initialScrollIndex != null && initialScrollIndex > 0 && content !== null) {
      this.contentLayoutChanged(content.offsetWidth, content.offsetHeight)
    }
  }

  detach(): void {
    this.observer?.disconnect()
    this.observer = null
    if (this.updateTimeout !== undefined) clearTimeout(this.updateTimeout)
    this.updateTimeout = undefined
    for (const entry of this.trackers) entry.tracker.dispose()
  }

  shouldWarnInitialScrollIndex(): boolean {
    return !this.hasTriggeredInitialScrollToIndex
  }

  readonly setScroller = (instance: ScrollViewInstance | null): void => {
    this.scroller = instance
  }

  readonly onCellElement = (cellKey: string, index: number, element: HTMLElement | null): void => {
    if (element === null) {
      const cell = this.cells.get(cellKey)
      if (cell === undefined) return
      this.observer?.unobserve(cell.element)
      this.cells.delete(cellKey)
      return
    }
    this.cells.set(cellKey, { index, element })
    this.observer?.observe(element)
  }

  readonly handleCellFocusCapture = (cellKey: string): void => {
    this.lastFocusedCellKey = cellKey
    this.updateCellsToRender()
  }

  readonly handleCellUnmount = (cellKey: string): void => {
    this.listMetrics.notifyCellUnmounted(cellKey)
  }

  // One observer for all cells. A cell can move with no size change of its own, so each callback
  // measures every mounted cell, as native fires onLayout for a move too.
  private readonly handleCellsResized = (): void => {
    if (this.measureCells()) this.scheduleCellsToRenderUpdate()
    this.updateViewableItems(this.state.cellsAroundViewport)
  }

  readonly handleLayout = (event: LayoutChangeEvent): void => {
    const scroller = this.scrollableNode()
    if (scroller !== null) this.rtl = isRightToLeft(scroller)
    const { layout } = event.nativeEvent
    this.scrollMetrics.crossAxisLength = this.selectCrossAxisLength(layout)
    // The client box, as in the scroll events: the scroll bars and borders don't count.
    this.scrollMetrics.visibleLength =
      scroller === null
        ? this.selectLength(layout)
        : this.selectLength({ width: scroller.clientWidth, height: scroller.clientHeight })
    this.props.onLayout?.(event)
    this.scheduleCellsToRenderUpdate()
    this.maybeCallOnEdgeReached()
  }

  readonly handleLayoutEmpty = (event: LayoutChangeEvent): void => {
    this.props.onLayout?.(event)
  }

  readonly handleLayoutFooter = (event: LayoutChangeEvent): void => {
    this.footerLength = this.selectLength(event.nativeEvent.layout)
  }

  readonly handleContentSizeChange = (width: number, height: number): void => {
    this.contentLayoutChanged(width, height)
    this.props.onContentSizeChange?.(width, height)
    this.scheduleCellsToRenderUpdate()
    this.maybeCallOnEdgeReached()
  }

  private contentLayoutChanged(width: number, height: number): void {
    this.listMetrics.notifyListContentLayout({
      layout: { width, height },
      orientation: this.orientation(),
    })
    // A change of the content can move cells with no size change of their own.
    if (this.measureCells()) this.updateViewableItems(this.state.cellsAroundViewport)
    this.maybeScrollToInitialScrollIndex(width, height)
  }

  readonly handleScroll = (event: ScrollEvent): void => {
    this.props.onScroll?.(event)
    const timestamp = event.timeStamp
    const { layoutMeasurement, zoomScale } = event.nativeEvent
    const crossAxisLength = this.selectCrossAxisLength(layoutMeasurement)
    const visibleLength = this.selectLength(layoutMeasurement)
    const offset = this.offsetFromScrollEvent(event)
    const dOffset = offset - this.scrollMetrics.offset
    const dt = this.scrollMetrics.timestamp
      ? Math.max(1, timestamp - this.scrollMetrics.timestamp)
      : 1
    const velocity = dOffset / dt
    this.scrollMetrics = {
      crossAxisLength,
      dt,
      dOffset,
      offset,
      timestamp,
      velocity,
      visibleLength,
      zoomScale: zoomScale < 0 ? 1 : zoomScale,
    }
    if (this.state.pendingScrollUpdateCount > 0) this.endPendingScrollUpdate()
    this.updateViewableItems(this.state.cellsAroundViewport)
    this.maybeCallOnEdgeReached()
    this.scheduleCellsToRenderUpdate()
  }

  readonly handleScrollBeginDrag = (event: ScrollEvent): void => {
    for (const entry of this.trackers) entry.tracker.recordInteraction()
    this.props.onScrollBeginDrag?.(event)
  }

  readonly handleScrollEndDrag = (event: ScrollEvent): void => {
    this.props.onScrollEndDrag?.(event)
  }

  readonly handleMomentumScrollBegin = (event: ScrollEvent): void => {
    this.props.onMomentumScrollBegin?.(event)
  }

  readonly handleMomentumScrollEnd = (event: ScrollEvent): void => {
    this.scrollMetrics.velocity = 0
    this.props.onMomentumScrollEnd?.(event)
  }

  private scrollToEnd(params?: { animated?: boolean | null | undefined } | null): void {
    const animated = params ? (params.animated ?? undefined) : true
    const veryLast = this.props.getItemCount(this.props.data) - 1
    if (veryLast < 0) return
    const frame = this.listMetrics.getCellMetricsApprox(veryLast, this.props)
    const offset = Math.max(
      0,
      frame.offset + frame.length + this.footerLength - this.scrollMetrics.visibleLength,
    )
    this.scrollToOffset({ animated, offset })
  }

  private scrollToIndex(params: ScrollToIndexParams): void {
    const { data, getItemCount, getItemLayout, onScrollToIndexFailed } = this.props
    const { animated, index, viewOffset, viewPosition } = params
    const itemCount = getItemCount(data)
    invariant(index >= 0, `scrollToIndex out of range: requested index ${index} but minimum is 0`)
    invariant(
      itemCount >= 1,
      `scrollToIndex out of range: item length ${itemCount} but minimum is 1`,
    )
    invariant(
      index < itemCount,
      `scrollToIndex out of range: requested index ${index} is out of 0 to ${itemCount - 1}`,
    )
    if (getItemLayout == null && index > this.listMetrics.getHighestMeasuredCellIndex()) {
      invariant(
        onScrollToIndexFailed != null,
        'scrollToIndex should be used in conjunction with getItemLayout or onScrollToIndexFailed, ' +
          'otherwise there is no way to know the location of offscreen indices or handle failures.',
      )
      onScrollToIndexFailed({
        averageItemLength: this.listMetrics.getAverageCellLength(),
        highestMeasuredFrameIndex: this.listMetrics.getHighestMeasuredCellIndex(),
        index,
      })
      return
    }
    const frame = this.listMetrics.getCellMetricsApprox(Math.floor(index), this.props)
    const offset =
      Math.max(
        0,
        this.listMetrics.getCellOffsetApprox(index, this.props) -
          (viewPosition || 0) * (this.scrollMetrics.visibleLength - frame.length),
      ) - (viewOffset || 0)
    this.scrollToOffset({ offset, animated })
  }

  private scrollToItem(params: ScrollToItemParams<ItemT>): void {
    const { data, getItem, getItemCount } = this.props
    const itemCount = getItemCount(data)
    for (let index = 0; index < itemCount; index++) {
      if (getItem(data, index) === params.item) {
        this.scrollToIndex({ ...params, index })
        break
      }
    }
  }

  private scrollToOffset({ animated, offset }: ScrollToOffsetParams): void {
    const scroller = this.scroller
    if (scroller === null) return
    if (typeof scroller.scrollTo !== 'function') {
      console.warn(
        'No scrollTo method provided. This may be because you have two nested ' +
          'VirtualizedLists with the same orientation, or because you are ' +
          'using a custom component that does not implement scrollTo.',
      )
      return
    }
    const { horizontal, rtl } = this.orientation()
    // A right-to-left scroller counts scrollLeft from its right edge, as 0 or less (CSSOM View).
    scroller.scrollTo(
      horizontal ? { x: rtl ? -offset : offset, animated } : { y: offset, animated },
    )
  }

  private recordInteraction(): void {
    for (const entry of this.trackers) entry.tracker.recordInteraction()
    this.updateViewableItems(this.state.cellsAroundViewport)
  }

  private scrollableNode(): HTMLElement | null {
    const scroller = this.scroller
    if (scroller === null) return null
    return typeof scroller.getScrollableNode === 'function'
      ? scroller.getScrollableNode()
      : scroller
  }

  // The content container: the parent of the cells, or the inner view of the ScrollView.
  private contentElement(): HTMLElement | null {
    const scroller = this.scroller
    if (scroller !== null && typeof scroller.getInnerViewNode === 'function') {
      return scroller.getInnerViewNode()
    }
    return this.cells.values().next().value?.element.parentElement ?? null
  }

  private orientation(): ListOrientation {
    return { horizontal: this.props.horizontal === true, rtl: this.rtl }
  }

  private selectLength(size: { width: number; height: number }): number {
    return this.props.horizontal === true ? size.width : size.height
  }

  private selectCrossAxisLength(size: { width: number; height: number }): number {
    return this.props.horizontal === true ? size.height : size.width
  }

  private offsetFromScrollEvent(event: ScrollEvent): number {
    const { contentOffset } = event.nativeEvent
    const { horizontal, rtl } = this.orientation()
    if (!horizontal) return contentOffset.y
    return rtl ? -contentOffset.x : contentOffset.x
  }

  private currentScrollOffset(): number | undefined {
    const scroller = this.scrollableNode()
    if (scroller === null) return undefined
    const { horizontal, rtl } = this.orientation()
    if (!horizontal) return scroller.scrollTop
    return rtl ? -scroller.scrollLeft : scroller.scrollLeft
  }

  private endPendingScrollUpdate(): void {
    this.setState((state) =>
      state.pendingScrollUpdateCount > 0 ? { ...state, pendingScrollUpdateCount: 0 } : state,
    )
  }

  // Reads every mounted cell. Returns true when a cell layout changed.
  private measureCells(): boolean {
    if (this.props.getItemLayout != null || this.cells.size === 0) return false
    const orientation = this.orientation()
    if (orientation.horizontal && orientation.rtl && !this.listMetrics.hasContentLength()) {
      const content = this.contentElement()
      if (content === null) return false
      this.listMetrics.notifyListContentLayout({
        orientation,
        layout: { width: content.offsetWidth, height: content.offsetHeight },
      })
    }
    const stickyCells = this.stickyCellIndices()
    let changed = false
    for (const [cellKey, cell] of this.cells) {
      const layout = stickyCells.has(cell.index)
        ? stickyCellLayout(cell.element)
        : elementLayout(cell.element)
      if (
        this.listMetrics.notifyCellLayout({ cellIndex: cell.index, cellKey, orientation, layout })
      ) {
        changed = true
      }
    }
    return changed
  }

  // The ScrollView makes no sticky header in a horizontal list.
  private stickyCellIndices(): Set<number> {
    const indices = new Set<number>()
    const { horizontal, stickyHeaderIndices, ListHeaderComponent } = this.props
    if (horizontal === true || stickyHeaderIndices == null) return indices
    const stickyOffset = ListHeaderComponent != null ? 1 : 0
    for (const index of stickyHeaderIndices) indices.add(index - stickyOffset)
    return indices
  }

  private maybeScrollToInitialScrollIndex(contentWidth: number, contentHeight: number): void {
    const { initialScrollIndex, contentOffset, data, getItemCount } = this.props
    if (
      contentWidth > 0 &&
      contentHeight > 0 &&
      initialScrollIndex != null &&
      initialScrollIndex > 0 &&
      !this.hasTriggeredInitialScrollToIndex
    ) {
      const before = this.currentScrollOffset()
      if (contentOffset == null) {
        if (initialScrollIndex < getItemCount(data)) {
          this.scrollToIndex({ animated: false, index: initialScrollIndex })
        } else {
          this.scrollToEnd({ animated: false })
        }
      }
      this.hasTriggeredInitialScrollToIndex = true
      // A browser fires no scroll event when the position doesn't change, so the list would wait
      // for one forever.
      if (this.currentScrollOffset() === before && before === this.scrollMetrics.offset) {
        this.endPendingScrollUpdate()
      }
    }
  }

  private maybeCallOnEdgeReached(): void {
    const {
      data,
      getItemCount,
      onStartReached,
      onStartReachedThreshold,
      onEndReached,
      onEndReachedThreshold,
    } = this.props
    if (!this.listMetrics.hasContentLength() || this.scrollMetrics.visibleLength === 0) return
    if (this.state.pendingScrollUpdateCount > 0) return

    const { visibleLength, offset } = this.scrollMetrics
    let distanceFromStart = offset
    let distanceFromEnd = this.listMetrics.getContentLength() - visibleLength - offset
    if (distanceFromStart < ON_EDGE_REACHED_EPSILON) distanceFromStart = 0
    if (distanceFromEnd < ON_EDGE_REACHED_EPSILON) distanceFromEnd = 0

    const startThreshold =
      onStartReachedThreshold != null
        ? onStartReachedThreshold * visibleLength
        : DEFAULT_EDGE_THRESHOLD_PX
    const endThreshold =
      onEndReachedThreshold != null
        ? onEndReachedThreshold * visibleLength
        : DEFAULT_EDGE_THRESHOLD_PX
    const isWithinStartThreshold = distanceFromStart <= startThreshold
    const isWithinEndThreshold = distanceFromEnd <= endThreshold
    const contentLength = this.listMetrics.getContentLength()
    const { cellsAroundViewport } = this.state

    if (
      onEndReached != null &&
      cellsAroundViewport.last === getItemCount(data) - 1 &&
      isWithinEndThreshold &&
      contentLength !== this.sentEndForContentLength
    ) {
      this.sentEndForContentLength = contentLength
      onEndReached({ distanceFromEnd })
    }
    if (
      onStartReached != null &&
      cellsAroundViewport.first === 0 &&
      isWithinStartThreshold &&
      contentLength !== this.sentStartForContentLength
    ) {
      this.sentStartForContentLength = contentLength
      onStartReached({ distanceFromStart })
    }
    // A scroll away from an edge and back calls the edge event again.
    if (!isWithinStartThreshold) this.sentStartForContentLength = 0
    if (!isWithinEndThreshold) this.sentEndForContentLength = 0
  }

  private scheduleCellsToRenderUpdate(): void {
    // A high-priority update needs a size estimate. With no estimate, it would render batches of
    // cells with no size, one after the other, and never let the browser lay them out.
    if (
      (this.listMetrics.getAverageCellLength() > 0 || this.props.getItemLayout != null) &&
      this.shouldRenderWithPriority() &&
      !this.hiPriInProgress
    ) {
      this.hiPriInProgress = true
      if (this.updateTimeout !== undefined) {
        clearTimeout(this.updateTimeout)
        this.updateTimeout = undefined
      }
      this.updateCellsToRender()
      return
    }
    if (this.updateTimeout === undefined) {
      this.updateTimeout = setTimeout(() => {
        this.updateTimeout = undefined
        this.updateCellsToRender()
      }, this.props.updateCellsBatchingPeriod ?? DEFAULT_UPDATE_CELLS_BATCHING_PERIOD)
    }
  }

  // True when the viewport is near a part of the list that isn't rendered.
  private shouldRenderWithPriority(): boolean {
    const { first, last } = this.state.cellsAroundViewport
    const { offset, visibleLength, velocity } = this.scrollMetrics
    const itemCount = this.props.getItemCount(this.props.data)
    const startThreshold = this.props.onStartReachedThreshold ?? DEFAULT_EDGE_THRESHOLD_VIEWPORTS
    const endThreshold = this.props.onEndReachedThreshold ?? DEFAULT_EDGE_THRESHOLD_VIEWPORTS
    let hiPri = false
    if (first > 0) {
      const distTop = offset - this.listMetrics.getCellMetricsApprox(first, this.props).offset
      hiPri = distTop < 0 || (velocity < -2 && distTop < (startThreshold * visibleLength) / 2)
    }
    if (!hiPri && last >= 0 && last < itemCount - 1) {
      const distBottom =
        this.listMetrics.getCellMetricsApprox(last, this.props).offset - (offset + visibleLength)
      hiPri = distBottom < 0 || (velocity > 2 && distBottom < (endThreshold * visibleLength) / 2)
    }
    return hiPri
  }

  private readonly updateCellsToRender = (): void => {
    this.updateViewableItems(this.state.cellsAroundViewport)
    this.setState((stored) => {
      const props = this.props
      const state = deriveState(props, stored)
      const cellsAroundViewport = this.adjustCellsAroundViewport(
        props,
        state.cellsAroundViewport,
        state.pendingScrollUpdateCount,
      )
      const renderMask = createRenderMask(
        props,
        cellsAroundViewport,
        this.nonViewportRenderRegions(props),
      )
      if (
        cellsAroundViewport.first === state.cellsAroundViewport.first &&
        cellsAroundViewport.last === state.cellsAroundViewport.last &&
        renderMask.equals(state.renderMask)
      ) {
        return state
      }
      return { ...state, cellsAroundViewport, renderMask }
    })
  }

  private adjustCellsAroundViewport(
    props: ListProps<ItemT>,
    cellsAroundViewport: CellRange,
    pendingScrollUpdateCount: number,
  ): CellRange {
    const itemCount = props.getItemCount(props.data)
    const { offset, visibleLength } = this.scrollMetrics
    const contentLength = this.listMetrics.getContentLength()
    const distanceFromEnd = contentLength - visibleLength - offset

    // Until the list has a layout, it trusts initialNumToRender.
    if (visibleLength <= 0 || contentLength <= 0) {
      return cellsAroundViewport.last >= itemCount
        ? constrainToItemCount(cellsAroundViewport, props)
        : cellsAroundViewport
    }

    const maxToRenderPerBatch = props.maxToRenderPerBatch ?? DEFAULT_MAX_TO_RENDER_PER_BATCH
    if (props.disableVirtualization === true) {
      const endThreshold = props.onEndReachedThreshold ?? DEFAULT_EDGE_THRESHOLD_VIEWPORTS
      const renderAhead = distanceFromEnd < endThreshold * visibleLength ? maxToRenderPerBatch : 0
      return {
        first: 0,
        last: Math.min(cellsAroundViewport.last + renderAhead, itemCount - 1),
      }
    }
    // A pending scroll can make a new window wrong, so the window stays.
    if (pendingScrollUpdateCount > 0) {
      return cellsAroundViewport.last >= itemCount
        ? constrainToItemCount(cellsAroundViewport, props)
        : cellsAroundViewport
    }
    const next = computeWindowedRenderLimits(
      props,
      maxToRenderPerBatch,
      props.windowSize ?? DEFAULT_WINDOW_SIZE,
      cellsAroundViewport,
      this.listMetrics,
      this.scrollMetrics,
    )
    invariant(next.last < itemCount, 'computeWindowedRenderLimits() should return range in-bounds')
    return next
  }

  // A viewport of cells stays rendered on each side of the focused cell, so a tab to the next
  // cell finds it.
  private nonViewportRenderRegions(props: ListProps<ItemT>): CellRange[] {
    const cellKey = this.lastFocusedCellKey
    const cell = cellKey === undefined ? undefined : this.cells.get(cellKey)
    if (cellKey === undefined || cell === undefined) return []
    const focusedCellIndex = cell.index
    const itemCount = props.getItemCount(props.data)
    if (focusedCellIndex >= itemCount || itemKeyAt(props, focusedCellIndex) !== cellKey) return []

    const { visibleLength } = this.scrollMetrics
    let first = focusedCellIndex
    let lengthBefore = 0
    for (let index = first - 1; index >= 0 && lengthBefore < visibleLength; index--) {
      first--
      lengthBefore += this.listMetrics.getCellMetricsApprox(index, props).length
    }
    let last = focusedCellIndex
    let lengthAfter = 0
    for (let index = last + 1; index < itemCount && lengthAfter < visibleLength; index++) {
      last++
      lengthAfter += this.listMetrics.getCellMetricsApprox(index, props).length
    }
    return [{ first, last }]
  }

  private updateViewableItems(cellsAroundViewport: CellRange): void {
    if (this.state.pendingScrollUpdateCount > 0 || this.trackers.length === 0) return
    const props = this.props
    const itemCount = props.getItemCount(props.data)
    const visibleLength =
      this.scrollMetrics.crossAxisLength > 0 ? this.scrollMetrics.visibleLength : 0
    const metricsAt = (index: number) => this.listMetrics.getCellMetrics(index, props)
    const createViewToken = (index: number, isViewable: boolean): ViewToken<ItemT> => {
      const item = props.getItem(props.data, index)
      return { index, item, key: keyOf(props, item, index), isViewable }
    }
    for (const entry of this.trackers) {
      const handler = entry.callback(props)
      if (handler == null) continue
      entry.tracker.onUpdate(
        itemCount,
        metricsAt,
        this.scrollMetrics.offset,
        visibleLength,
        createViewToken,
        handler,
        cellsAroundViewport,
      )
    }
  }
}

type CustomScrollerProps = ScrollViewProps &
  Pick<VirtualizedListProps<unknown>, 'onRefresh' | 'refreshing' | 'progressViewOffset'> & {
    render: (props: ScrollViewProps) => ReactElement<ScrollViewProps>
  }

// Calls `renderScrollComponent` in a render of its own. A call in the list render would hand it
// handlers that read refs.
function CustomScroller({ render, ref, ...props }: CustomScrollerProps): ReactElement {
  return cloneElement(render(props), { ref }, props.children)
}

export function VirtualizedList<ItemT>(props: VirtualizedListProps<ItemT>): ReactElement {
  const listProps = resolveProps(props)
  const {
    data,
    renderItem,
    ListItemComponent,
    keyExtractor,
    getItemLayout,
    inverted,
    initialScrollIndex,
    windowSize,
    disableVirtualization,
    ItemSeparatorComponent,
    ListEmptyComponent,
    ListHeaderComponent,
    ListHeaderComponentStyle,
    ListFooterComponent,
    ListFooterComponentStyle,
    CellRendererComponent,
    renderScrollComponent,
    onRefresh,
    refreshing,
    progressViewOffset,
    horizontal = false,
    style,
    stickyHeaderIndices,
    invertStickyHeaders,
    contentContainerStyle,
    ref,
    // The controller reads these from the props.
    getItem: _getItem,
    getItemCount: _getItemCount,
    extraData: _extraData,
    initialNumToRender: _initialNumToRender,
    maxToRenderPerBatch: _maxToRenderPerBatch,
    updateCellsBatchingPeriod: _updateCellsBatchingPeriod,
    onEndReached: _onEndReached,
    onEndReachedThreshold: _onEndReachedThreshold,
    onStartReached: _onStartReached,
    onStartReachedThreshold: _onStartReachedThreshold,
    onViewableItemsChanged: _onViewableItemsChanged,
    viewabilityConfig: _viewabilityConfig,
    viewabilityConfigCallbackPairs: _viewabilityConfigCallbackPairs,
    onScrollToIndexFailed: _onScrollToIndexFailed,
    onScroll: _onScroll,
    onLayout: _onLayout,
    onContentSizeChange: _onContentSizeChange,
    onScrollBeginDrag: _onScrollBeginDrag,
    onScrollEndDrag: _onScrollEndDrag,
    onMomentumScrollBegin: _onMomentumScrollBegin,
    onMomentumScrollEnd: _onMomentumScrollEnd,
    debug: _debug,
    ...scrollViewProps
  } = props

  invariant(
    (windowSize ?? DEFAULT_WINDOW_SIZE) > 0,
    'VirtualizedList: The windowSize prop must be present and set to a value greater than 0.',
  )

  const [state, setState] = useState(() => initialState(listProps))
  const [list] = useState(() => new ListController(listProps, setState))
  const current = deriveState(listProps, state)
  const itemCount = listProps.getItemCount(data)

  if (
    initialScrollIndex != null &&
    (initialScrollIndex < 0 || (itemCount > 0 && initialScrollIndex >= itemCount)) &&
    list.shouldWarnInitialScrollIndex()
  ) {
    warnOnce(
      'VirtualizedList.initialScrollIndex',
      `initialScrollIndex "${initialScrollIndex}" is not valid (list has ${itemCount} items)`,
    )
  }
  if (!isProductionEnv()) {
    const flat = StyleSheet.flatten(contentContainerStyle) as ViewStyle | undefined
    if (flat?.flexWrap === 'wrap') {
      warnOnce(
        'VirtualizedList.flexWrap',
        '`flexWrap: `wrap`` is not supported with the `VirtualizedList` components.' +
          'Consider using `numColumns` with `FlatList` instead.',
      )
    }
  }

  useLayoutEffect(() => {
    const prevProps = list.commit(listProps, current)
    if (prevProps !== undefined) list.didUpdate(prevProps)
  })

  useLayoutEffect(() => {
    list.attach()
    return () => list.detach()
  }, [list])

  useImperativeHandle(ref, () => list.instance, [list])

  const inversionStyle = inverted
    ? horizontal
      ? horizontallyInvertedStyle
      : verticallyInvertedStyle
    : undefined
  const cells: ReactNode[] = []
  const stickyIndicesFromProps = new Set(stickyHeaderIndices)
  const stickyHeaderIndicesForScroller: number[] = []
  const stickyOffset = ListHeaderComponent != null ? 1 : 0

  if (ListHeaderComponent != null) {
    if (stickyIndicesFromProps.has(0)) stickyHeaderIndicesForScroller.push(0)
    cells.push(
      <View key="$header" style={StyleSheet.compose(inversionStyle, ListHeaderComponentStyle)}>
        {renderListComponent(ListHeaderComponent)}
      </View>,
    )
  }

  if (itemCount === 0 && ListEmptyComponent != null) {
    cells.push(
      <Fragment key="$empty">
        {renderEmptyComponent(ListEmptyComponent, inversionStyle, list.handleLayoutEmpty)}
      </Fragment>,
    )
  }

  if (itemCount > 0) {
    let usedIndexForKey = false
    const regions = current.renderMask.enumerateRegions()
    const lastRegion = regions[regions.length - 1]
    const lastSpacer = lastRegion?.isSpacer === true ? lastRegion : undefined
    const end = itemCount - 1

    for (const region of regions) {
      if (region.isSpacer) {
        if (disableVirtualization === true) continue
        // With no getItemLayout, the spacer at the end reaches only the last measured cell, so a
        // fast scroll can't pass far into cells that would move the content when they render.
        const last =
          region === lastSpacer && getItemLayout == null
            ? clamp(region.first - 1, region.last, list.listMetrics.getHighestMeasuredCellIndex())
            : region.last
        const firstMetrics = list.listMetrics.getCellMetricsApprox(region.first, listProps)
        const lastMetrics = list.listMetrics.getCellMetricsApprox(last, listProps)
        const length = lastMetrics.offset + lastMetrics.length - firstMetrics.offset
        cells.push(
          <div
            key={`$spacer-${region.first}`}
            aria-hidden
            style={spacerStyle(horizontal, length)}
          />,
        )
        continue
      }
      let prevCellKey: string | undefined
      for (let index = region.first; index <= Math.min(end, region.last); index++) {
        const item = listProps.getItem(data, index)
        const cellKey = keyOf(listProps, item, index)
        if (keyExtractor == null && cellKey === String(index)) usedIndexForKey = true
        if (stickyIndicesFromProps.has(index + stickyOffset)) {
          stickyHeaderIndicesForScroller.push(cells.length)
        }
        cells.push(
          <CellRenderer<ItemT>
            key={cellKey}
            CellRendererComponent={CellRendererComponent}
            ItemSeparatorComponent={index < end ? ItemSeparatorComponent : undefined}
            ListItemComponent={ListItemComponent}
            cellKey={cellKey}
            horizontal={horizontal}
            index={index}
            inverted={inverted === true}
            item={item}
            prevCellKey={prevCellKey}
            renderItem={renderItem}
            separatorUpdaters={list.separatorUpdaters}
            onCellElement={list.onCellElement}
            onCellFocusCapture={list.handleCellFocusCapture}
            onUnmount={list.handleCellUnmount}
          />,
        )
        prevCellKey = cellKey
      }
    }

    if (usedIndexForKey) {
      warnOnce(
        'VirtualizedList.keys',
        'VirtualizedList: missing keys for items, make sure to specify a key or id property on ' +
          'each item or provide a custom keyExtractor.',
      )
    }
  }

  if (ListFooterComponent != null) {
    cells.push(
      <View
        key="$footer"
        onLayout={list.handleLayoutFooter}
        style={StyleSheet.compose(inversionStyle, ListFooterComponentStyle)}
      >
        {renderListComponent(ListFooterComponent)}
      </View>,
    )
  }

  const { setScroller } = list
  const scrollProps: ScrollViewProps = {
    ...scrollViewProps,
    contentContainerStyle,
    horizontal,
    onContentSizeChange: list.handleContentSizeChange,
    onLayout: list.handleLayout,
    onScroll: list.handleScroll,
    onScrollBeginDrag: list.handleScrollBeginDrag,
    onScrollEndDrag: list.handleScrollEndDrag,
    onMomentumScrollBegin: list.handleMomentumScrollBegin,
    onMomentumScrollEnd: list.handleMomentumScrollEnd,
    invertStickyHeaders: invertStickyHeaders ?? inverted ?? undefined,
    stickyHeaderIndices: stickyHeaderIndicesForScroller,
    style: inversionStyle ? [inversionStyle, style] : style,
    children: cells,
  }

  if (renderScrollComponent !== undefined) {
    return (
      <CustomScroller
        {...scrollProps}
        onRefresh={onRefresh}
        refreshing={refreshing}
        progressViewOffset={progressViewOffset}
        ref={setScroller}
        render={renderScrollComponent}
      />
    )
  }

  // React Native's `_defaultRenderScrollComponent`: a `refreshControl` of the app wins.
  let refreshControl = scrollProps.refreshControl
  if (onRefresh != null) {
    invariant(
      typeof refreshing === 'boolean',
      '`refreshing` prop must be set as a boolean in order to use `onRefresh`, but got `' +
        JSON.stringify(refreshing ?? 'undefined') +
        '`',
    )
    refreshControl ??= (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        progressViewOffset={progressViewOffset}
      />
    )
  }
  return <ScrollView {...scrollProps} refreshControl={refreshControl} ref={setScroller} />
}
