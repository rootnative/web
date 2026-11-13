import type { ReactElement, Ref } from 'react'

import type { ViewStyle } from '../../apis/StyleSheet/types'
import type { NativeSyntheticEvent } from '../../events/types'
import type { StyleProp } from '../../style/types'
import type { ViewProps } from '../View/types'

export type NativeScrollPoint = { x: number; y: number }
export type NativeScrollSize = { width: number; height: number }
export type NativeScrollRectangle = { top: number; left: number; bottom: number; right: number }

export type NativeScrollEvent = {
  contentInset: NativeScrollRectangle
  contentOffset: NativeScrollPoint
  contentSize: NativeScrollSize
  layoutMeasurement: NativeScrollSize
  zoomScale: number
}

export type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>

export type ScrollToOptions = {
  x?: number | undefined
  y?: number | undefined
  animated?: boolean | undefined
}

export type ScrollViewInstance = HTMLElement & {
  // The React Native form. The DOM forms `scrollTo(x, y)` and
  // `scrollTo({ left, top, behavior })` still work.
  scrollTo: {
    (options: ScrollToOptions): void
    (x: number, y: number): void
    (options: globalThis.ScrollToOptions): void
  }
  scrollToEnd: (options?: { animated?: boolean | undefined }) => void
  flashScrollIndicators: () => void
  getScrollResponder: () => ScrollViewInstance
  getScrollableNode: () => HTMLElement
  getInnerViewNode: () => HTMLElement | null
  getInnerViewRef: () => HTMLElement | null
  getNativeScrollRef: () => HTMLElement
}

type ReservedViewProps = 'ref' | 'onScroll' | 'onScrollEnd'

export type ScrollViewProps = Omit<ViewProps, ReservedViewProps> & {
  ref?: Ref<ScrollViewInstance> | undefined
  contentContainerStyle?: StyleProp<ViewStyle> | undefined
  horizontal?: boolean | undefined
  scrollEnabled?: boolean | undefined
  showsHorizontalScrollIndicator?: boolean | undefined
  showsVerticalScrollIndicator?: boolean | undefined
  pagingEnabled?: boolean | undefined
  snapToInterval?: number | undefined
  snapToOffsets?: ReadonlyArray<number> | undefined
  snapToAlignment?: 'start' | 'center' | 'end' | undefined
  snapToStart?: boolean | undefined
  snapToEnd?: boolean | undefined
  contentOffset?: NativeScrollPoint | undefined
  centerContent?: boolean | undefined
  stickyHeaderIndices?: ReadonlyArray<number> | undefined
  stickyHeaderHiddenOnScroll?: boolean | undefined
  invertStickyHeaders?: boolean | undefined
  keyboardDismissMode?: 'none' | 'on-drag' | 'interactive' | undefined
  keyboardShouldPersistTaps?: boolean | 'always' | 'never' | 'handled' | undefined
  refreshControl?: ReactElement | undefined
  scrollEventThrottle?: number | undefined
  onScroll?: ((event: ScrollEvent) => void) | undefined
  onScrollBeginDrag?: ((event: ScrollEvent) => void) | undefined
  onScrollEndDrag?: ((event: ScrollEvent) => void) | undefined
  onMomentumScrollBegin?: ((event: ScrollEvent) => void) | undefined
  onMomentumScrollEnd?: ((event: ScrollEvent) => void) | undefined
  onContentSizeChange?: ((width: number, height: number) => void) | undefined
  // Native only. Accepted and ignored.
  alwaysBounceHorizontal?: boolean | undefined
  alwaysBounceVertical?: boolean | undefined
  automaticallyAdjustContentInsets?: boolean | undefined
  automaticallyAdjustKeyboardInsets?: boolean | undefined
  automaticallyAdjustsScrollIndicatorInsets?: boolean | undefined
  bounces?: boolean | undefined
  bouncesZoom?: boolean | undefined
  canCancelContentTouches?: boolean | undefined
  contentInset?: Partial<NativeScrollRectangle> | undefined
  contentInsetAdjustmentBehavior?: 'automatic' | 'scrollableAxes' | 'never' | 'always' | undefined
  decelerationRate?: 'fast' | 'normal' | number | undefined
  directionalLockEnabled?: boolean | undefined
  disableIntervalMomentum?: boolean | undefined
  disableScrollViewPanResponder?: boolean | undefined
  endFillColor?: unknown
  fadingEdgeLength?: number | undefined
  indicatorStyle?: 'default' | 'black' | 'white' | undefined
  maintainVisibleContentPosition?:
    { minIndexForVisible: number; autoscrollToTopThreshold?: number | undefined } | undefined
  maximumZoomScale?: number | undefined
  minimumZoomScale?: number | undefined
  nestedScrollEnabled?: boolean | undefined
  overScrollMode?: 'auto' | 'always' | 'never' | undefined
  persistentScrollbar?: boolean | undefined
  pinchGestureEnabled?: boolean | undefined
  removeClippedSubviews?: boolean | undefined
  scrollIndicatorInsets?: Partial<NativeScrollRectangle> | undefined
  scrollPerfTag?: string | undefined
  scrollToOverflowEnabled?: boolean | undefined
  scrollsToTop?: boolean | undefined
  snapToIntervalMomentum?: boolean | undefined
  zoomScale?: number | undefined
  onScrollToTop?: ((event: ScrollEvent) => void) | undefined
}
