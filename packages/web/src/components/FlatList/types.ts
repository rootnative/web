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

export type ListRenderItem<ItemT> = (info: ListRenderItemInfo<ItemT>) => ReactElement | null

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

export type FlatListInstance<ItemT = unknown> = {
  scrollToEnd: (params?: { animated?: boolean | undefined } | null) => void
  scrollToIndex: (params: ScrollToIndexParams) => void
  scrollToItem: (params: ScrollToItemParams<ItemT>) => void
  scrollToOffset: (params: ScrollToOffsetParams) => void
  recordInteraction: () => void
  flashScrollIndicators: () => void
  getScrollResponder: () => ScrollViewInstance | null
  getNativeScrollRef: () => ScrollViewInstance | null
  getScrollableNode: () => HTMLElement | null
  setNativeProps: (props: Record<string, unknown>) => void
}

type ReservedScrollViewProps = 'ref' | 'children'

export type FlatListProps<ItemT> = Omit<ScrollViewProps, ReservedScrollViewProps> & {
  ref?: Ref<FlatListInstance<ItemT>> | undefined
  data: Readonly<ArrayLike<ItemT>> | null | undefined
  renderItem?: ListRenderItem<ItemT> | null | undefined
  ListItemComponent?: ComponentType<ListRenderItemInfo<ItemT>> | undefined
  keyExtractor?: ((item: ItemT, index: number) => string) | undefined
  extraData?: unknown
  getItemLayout?:
    | ((
        data: Readonly<ArrayLike<ItemT>> | null | undefined,
        index: number,
      ) => { length: number; offset: number; index: number })
    | undefined
  numColumns?: number | undefined
  columnWrapperStyle?: StyleProp<ViewStyle> | undefined
  inverted?: boolean | null | undefined
  initialScrollIndex?: number | null | undefined
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
  // Native only, or virtualizer only. Accepted and ignored.
  debug?: boolean | undefined
  disableVirtualization?: boolean | undefined
  initialNumToRender?: number | undefined
  maxToRenderPerBatch?: number | undefined
  strictMode?: boolean | undefined
  updateCellsBatchingPeriod?: number | undefined
  windowSize?: number | undefined
  legacyImplementation?: boolean | undefined
}
