import type { ComponentType, ReactElement, Ref } from 'react'

import type { ViewStyle } from '../../apis/StyleSheet/types'
import type { StyleProp } from '../../style/types'
import type { ScrollViewInstance, ScrollViewProps } from '../ScrollView/types'
import type {
  CellRendererProps,
  ListComponent,
  ListRenderItem,
  ListRenderItemInfo,
  ListSeparatorComponent,
  ScrollToIndexParams,
  ScrollToItemParams,
  ScrollToOffsetParams,
  ViewabilityConfig,
  ViewabilityConfigCallbackPairs,
  ViewableItemsChangedInfo,
} from '../VirtualizedList/types'

export type {
  CellRendererProps,
  ListComponent,
  ListRenderItem,
  ListRenderItemInfo,
  ListSeparatorComponent,
  ListSeparatorProps,
  ListSeparators,
  ScrollToIndexParams,
  ScrollToItemParams,
  ScrollToOffsetParams,
  ViewabilityConfig,
  ViewabilityConfigCallbackPair,
  ViewabilityConfigCallbackPairs,
  ViewableItemsChangedInfo,
  ViewToken,
} from '../VirtualizedList/types'

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

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface FlatListProps<ItemT> extends Omit<ScrollViewProps, ReservedScrollViewProps> {
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
