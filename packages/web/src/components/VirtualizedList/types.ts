import type { ComponentType, FocusEvent, ReactElement, ReactNode, Ref } from 'react'

import type { ViewStyle } from '../../apis/StyleSheet/types'
import type { StyleProp } from '../../style/types'
import type { ScrollViewInstance, ScrollViewProps } from '../ScrollView/types'
import type { LayoutChangeEvent } from '../View/types'

export type ViewToken<ItemT = unknown> = {
  item: ItemT
  key: string
  index: number | null
  isViewable: boolean
  section?: unknown
}

export type ViewabilityConfig = {
  minimumViewTime?: number | undefined
  viewAreaCoveragePercentThreshold?: number | undefined
  itemVisiblePercentThreshold?: number | undefined
  waitForInteraction?: boolean | undefined
}

export type ViewableItemsChangedInfo<ItemT = unknown> = {
  viewableItems: Array<ViewToken<ItemT>>
  changed: Array<ViewToken<ItemT>>
}

export type ViewabilityConfigCallbackPair<ItemT = unknown> = {
  viewabilityConfig: ViewabilityConfig
  onViewableItemsChanged: ((info: ViewableItemsChangedInfo<ItemT>) => void) | null
}

export type ViewabilityConfigCallbackPairs<ItemT = unknown> = Array<
  ViewabilityConfigCallbackPair<ItemT>
>

export type ListSeparators = {
  highlight: () => void
  unhighlight: () => void
  updateProps: (select: 'leading' | 'trailing', newProps: Record<string, unknown>) => void
}

export type ListRenderItemInfo<ItemT> = {
  item: ItemT
  index: number
  separators: ListSeparators
}

export type ListRenderItem<ItemT> = (info: ListRenderItemInfo<ItemT>) => ReactNode

export type CellRendererProps<ItemT> = {
  cellKey: string
  children: ReactNode
  index: number
  item: ItemT
  onFocusCapture?: ((event: FocusEvent<HTMLElement>) => void) | undefined
  onLayout?: ((event: LayoutChangeEvent) => void) | undefined
  style: StyleProp<ViewStyle> | undefined
}

// A component rendered with no props, or a ready element.
export type ListComponent = ComponentType<Record<string, never>> | ReactElement | null | undefined

export type ListSeparatorProps<ItemT> = { highlighted: boolean; leadingItem: ItemT }

export type ListSeparatorComponent<ItemT> =
  ComponentType<ListSeparatorProps<ItemT>> | ReactElement | null | undefined

export type ScrollToIndexParams = {
  animated?: boolean | undefined
  index: number
  viewOffset?: number | undefined
  viewPosition?: number | undefined
}

export type ScrollToItemParams<ItemT> = {
  animated?: boolean | undefined
  item: ItemT
  viewOffset?: number | undefined
  viewPosition?: number | undefined
}

export type ScrollToOffsetParams = {
  animated?: boolean | undefined
  offset: number
}

// React Native types the data as `any`, so `getItem` can read any collection, such as an
// immutable list.
// oxlint-disable-next-line typescript/no-explicit-any
type ListData = any

export type GetItemLayout = (
  data: ListData,
  index: number,
) => { length: number; offset: number; index: number }

export type VirtualizedListInstance<ItemT = unknown> = {
  scrollToEnd: (params?: { animated?: boolean | null | undefined } | null) => void
  scrollToIndex: (params: ScrollToIndexParams) => void
  scrollToItem: (params: ScrollToItemParams<ItemT>) => void
  scrollToOffset: (params: ScrollToOffsetParams) => void
  recordInteraction: () => void
  flashScrollIndicators: () => void
  getScrollResponder: () => ScrollViewInstance | null
  getScrollableNode: () => HTMLElement | null
  getScrollRef: () => ScrollViewInstance | null
  setNativeProps: (props: Record<string, unknown>) => void
  hasMore: () => boolean
}

type ReservedScrollViewProps = 'ref' | 'children'

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface VirtualizedListProps<ItemT> extends Omit<
  ScrollViewProps,
  ReservedScrollViewProps
> {
  ref?: Ref<VirtualizedListInstance<ItemT>> | undefined
  data?: ListData
  getItem?: ((data: ListData, index: number) => ItemT) | undefined
  getItemCount?: ((data: ListData) => number) | undefined
  renderItem?: ListRenderItem<ItemT> | null | undefined
  ListItemComponent?: ComponentType<ListRenderItemInfo<ItemT>> | null | undefined
  keyExtractor?: ((item: ItemT, index: number) => string) | null | undefined
  extraData?: unknown
  getItemLayout?: GetItemLayout | undefined
  inverted?: boolean | null | undefined
  initialNumToRender?: number | undefined
  initialScrollIndex?: number | null | undefined
  maxToRenderPerBatch?: number | undefined
  windowSize?: number | undefined
  updateCellsBatchingPeriod?: number | undefined
  disableVirtualization?: boolean | undefined
  ItemSeparatorComponent?: ListSeparatorComponent<ItemT>
  ListEmptyComponent?: ListComponent
  ListHeaderComponent?: ListComponent
  ListHeaderComponentStyle?: StyleProp<ViewStyle> | undefined
  ListFooterComponent?: ListComponent
  ListFooterComponentStyle?: StyleProp<ViewStyle> | undefined
  CellRendererComponent?: ComponentType<CellRendererProps<ItemT>> | null | undefined
  renderScrollComponent?: ((props: ScrollViewProps) => ReactElement<ScrollViewProps>) | undefined
  onEndReached?: ((info: { distanceFromEnd: number }) => void) | null | undefined
  onEndReachedThreshold?: number | null | undefined
  onStartReached?: ((info: { distanceFromStart: number }) => void) | null | undefined
  onStartReachedThreshold?: number | null | undefined
  onViewableItemsChanged?: ((info: ViewableItemsChangedInfo<ItemT>) => void) | null | undefined
  viewabilityConfig?: ViewabilityConfig | undefined
  viewabilityConfigCallbackPairs?: ViewabilityConfigCallbackPairs<ItemT> | undefined
  onScrollToIndexFailed?:
    | ((info: {
        index: number
        highestMeasuredFrameIndex: number
        averageItemLength: number
      }) => void)
    | undefined
  // With `onRefresh`, the list wraps its scroller in a RefreshControl. `refreshing` must be a boolean.
  onRefresh?: (() => void) | null | undefined
  refreshing?: boolean | null | undefined
  progressViewOffset?: number | undefined
  // React Native draws a debug overlay of the window. Accepted and ignored.
  debug?: boolean | undefined
}

export type CellMetrics = {
  index: number
  // Along the scroll axis.
  length: number
  // From the start of the list, along the scroll axis.
  offset: number
  // False after the cell unmounts. A metric from `getItemLayout` is exact, so it's true too.
  isMounted: boolean
}

export type ListOrientation = { horizontal: boolean; rtl: boolean }

// The props that the cell metrics read.
export type CellMetricProps<ItemT, DataT> = {
  data: DataT
  getItemCount: (data: DataT) => number
  getItem: (data: DataT, index: number) => ItemT
  getItemLayout?:
    ((data: DataT, index: number) => { length: number; offset: number; index: number }) | undefined
  keyExtractor?: ((item: ItemT, index: number) => string) | null | undefined
}

// An inclusive range, so `{ first: 0, last: -1 }` holds no cell.
export type CellRange = { first: number; last: number }

export type CellMetricsSource = {
  getCellMetricsApprox<ItemT, DataT>(
    index: number,
    props: CellMetricProps<ItemT, DataT>,
  ): CellMetrics
}
