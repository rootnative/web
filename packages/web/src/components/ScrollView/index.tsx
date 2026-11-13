import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type UIEvent,
} from 'react'

import { Platform } from '../../apis/Platform'
import { StyleSheet } from '../../apis/StyleSheet'
import type { StyleRegistry } from '../../style/registry'
import { splitLayoutProps } from '../../style/splitLayoutProps'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { webStyle } from '../../style/webStyle'
import { hasDOM } from '../../utils/env'
import { useViewElement, View } from '../View'
import type { LayoutChangeEvent } from '../View/types'
import { snapTarget } from './snap'
import type {
  NativeScrollEvent,
  ScrollEvent,
  ScrollToOptions,
  ScrollViewInstance,
  ScrollViewProps,
} from './types'

export type {
  NativeScrollEvent,
  NativeScrollPoint,
  NativeScrollRectangle,
  NativeScrollSize,
  ScrollEvent,
  ScrollToOptions,
  ScrollViewInstance,
  ScrollViewProps,
} from './types'

const scrollerStyle = webStyle({
  flexGrow: 1,
  flexShrink: 1,
  overflowX: 'hidden',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
})

const horizontalScrollerStyle = webStyle({
  flexDirection: 'row',
  overflowX: 'auto',
  overflowY: 'hidden',
})

const disabledScrollerStyle = webStyle({ overflowX: 'hidden', overflowY: 'hidden' })

// The base of the box that wraps the scroller, as React Native's on Android.
const refreshAreaStyle = Object.freeze({ flexGrow: 1, flexShrink: 1 })

const horizontalContentStyle = Object.freeze({ flexDirection: 'row' })

const centerContentStyle = Object.freeze({ flexGrow: 1, justifyContent: 'center' })

const stickyStyle = webStyle({ position: 'sticky', top: 0, zIndex: 10 })

const invertedStickyStyle = webStyle({ position: 'sticky', bottom: 0, zIndex: 10 })

const hiddenScrollbarClass = (registry: StyleRegistry): string =>
  registry.staticClass('rn-scrollbar-none', [
    '.rn-scrollbar-none{scrollbar-width:none;-ms-overflow-style:none}',
    '.rn-scrollbar-none::-webkit-scrollbar{display:none}',
  ])

const supportsScrollEnd = hasDOM() && 'onscrollend' in window

// For browsers without the scrollend event.
const SCROLL_END_DELAY = 150

const behaviorFor = (animated: boolean | undefined): ScrollBehavior =>
  animated !== false && !Platform.isDisableAnimations ? 'smooth' : 'auto'

const describe = (element: HTMLElement): NativeScrollEvent => ({
  contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
  contentOffset: { x: element.scrollLeft, y: element.scrollTop },
  contentSize: { width: element.scrollWidth, height: element.scrollHeight },
  layoutMeasurement: { width: element.clientWidth, height: element.clientHeight },
  zoomScale: 1,
})

const isReactNativeScrollTo = (value: unknown): value is ScrollToOptions =>
  typeof value === 'object' &&
  value !== null &&
  ('x' in value || 'y' in value || 'animated' in value)

const domScrollTo = (element: HTMLElement, options: ScrollToOptions): void => {
  const init: globalThis.ScrollToOptions = { behavior: behaviorFor(options.animated) }
  if (options.x !== undefined) init.left = options.x
  if (options.y !== undefined) init.top = options.y
  element.scrollTo(init)
}

type Phase = 'idle' | 'drag' | 'released' | 'momentum'

type ScrollHandlers = Pick<
  ScrollViewProps,
  | 'onScroll'
  | 'onScrollBeginDrag'
  | 'onScrollEndDrag'
  | 'onMomentumScrollBegin'
  | 'onMomentumScrollEnd'
>

export function ScrollView(props: ScrollViewProps): ReactElement {
  const {
    centerContent,
    children,
    contentContainerStyle,
    contentOffset,
    horizontal = false,
    invertStickyHeaders,
    keyboardDismissMode,
    onContentSizeChange,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
    onPointerDown,
    onScroll,
    onScrollBeginDrag,
    onScrollEndDrag,
    pagingEnabled,
    ref,
    refreshControl,
    scrollEnabled = true,
    showsHorizontalScrollIndicator = true,
    showsVerticalScrollIndicator = true,
    snapToAlignment = 'start',
    snapToEnd = true,
    snapToInterval,
    snapToOffsets,
    snapToStart = true,
    stickyHeaderHiddenOnScroll,
    stickyHeaderIndices,
    style,
    // Native only.
    alwaysBounceHorizontal: _alwaysBounceHorizontal,
    alwaysBounceVertical: _alwaysBounceVertical,
    automaticallyAdjustContentInsets: _automaticallyAdjustContentInsets,
    automaticallyAdjustKeyboardInsets: _automaticallyAdjustKeyboardInsets,
    automaticallyAdjustsScrollIndicatorInsets: _automaticallyAdjustsScrollIndicatorInsets,
    bounces: _bounces,
    bouncesZoom: _bouncesZoom,
    canCancelContentTouches: _canCancelContentTouches,
    contentInset: _contentInset,
    contentInsetAdjustmentBehavior: _contentInsetAdjustmentBehavior,
    decelerationRate: _decelerationRate,
    directionalLockEnabled: _directionalLockEnabled,
    disableIntervalMomentum: _disableIntervalMomentum,
    disableScrollViewPanResponder: _disableScrollViewPanResponder,
    endFillColor: _endFillColor,
    fadingEdgeLength: _fadingEdgeLength,
    indicatorStyle: _indicatorStyle,
    keyboardShouldPersistTaps: _keyboardShouldPersistTaps,
    maintainVisibleContentPosition: _maintainVisibleContentPosition,
    maximumZoomScale: _maximumZoomScale,
    minimumZoomScale: _minimumZoomScale,
    nestedScrollEnabled: _nestedScrollEnabled,
    onScrollToTop: _onScrollToTop,
    overScrollMode: _overScrollMode,
    persistentScrollbar: _persistentScrollbar,
    pinchGestureEnabled: _pinchGestureEnabled,
    removeClippedSubviews: _removeClippedSubviews,
    scrollEventThrottle: _scrollEventThrottle,
    scrollIndicatorInsets: _scrollIndicatorInsets,
    scrollPerfTag: _scrollPerfTag,
    scrollToOverflowEnabled: _scrollToOverflowEnabled,
    scrollsToTop: _scrollsToTop,
    snapToIntervalMomentum: _snapToIntervalMomentum,
    zoomScale: _zoomScale,
    ...rest
  } = props

  const registry = useStyleRegistry()
  const scroller = useRef<HTMLElement | null>(null)
  const content = useRef<HTMLElement | null>(null)

  // The latest handlers, for the listeners an effect owns.
  const handlers = useRef<ScrollHandlers>({})
  useEffect(() => {
    handlers.current = {
      onScroll,
      onScrollBeginDrag,
      onScrollEndDrag,
      onMomentumScrollBegin,
      onMomentumScrollEnd,
    }
  })

  const snap = useRef({
    horizontal,
    pagingEnabled: pagingEnabled === true,
    snapToInterval,
    snapToOffsets,
    snapToAlignment,
    snapToStart,
    snapToEnd,
    keyboardDismissMode,
    stickyHeaderHiddenOnScroll: stickyHeaderHiddenOnScroll === true,
  })
  useEffect(() => {
    snap.current = {
      horizontal,
      pagingEnabled: pagingEnabled === true,
      snapToInterval,
      snapToOffsets,
      snapToAlignment,
      snapToStart,
      snapToEnd,
      keyboardDismissMode,
      stickyHeaderHiddenOnScroll: stickyHeaderHiddenOnScroll === true,
    }
  })

  // The scroll sequence: drag, release, momentum, settle. Pointer state and
  // the phase live in refs, so a scroll frame never renders.
  const sequence = useRef<{
    phase: Phase
    pointerDown: boolean
    lastEvent: ScrollEvent | null
    lastOffset: number
    timer: ReturnType<typeof setTimeout> | undefined
    snapping: boolean
  }>({
    phase: 'idle',
    pointerDown: false,
    lastEvent: null,
    lastOffset: 0,
    timer: undefined,
    snapping: false,
  })
  const stickyHeaders = useRef<HTMLElement[]>([])

  const refreshEvent = useCallback((): ScrollEvent | null => {
    const state = sequence.current
    const element = scroller.current
    if (state.lastEvent === null || element === null) return null
    Object.assign(state.lastEvent.nativeEvent, describe(element))
    return state.lastEvent
  }, [])

  const settle = useCallback((): void => {
    const state = sequence.current
    const element = scroller.current
    if (element === null) return
    if (state.pointerDown && state.phase === 'drag') return

    if (state.phase === 'momentum') {
      const event = refreshEvent()
      if (event !== null) handlers.current.onMomentumScrollEnd?.(event)
    }
    state.phase = 'idle'

    if (state.snapping) {
      state.snapping = false
      return
    }
    const config = snap.current
    const axis = config.horizontal
    const viewport = axis ? element.clientWidth : element.clientHeight
    const target = snapTarget(
      axis ? element.scrollLeft : element.scrollTop,
      viewport,
      axis ? element.scrollWidth : element.scrollHeight,
      {
        offsets: config.snapToOffsets,
        interval: config.pagingEnabled ? viewport : config.snapToInterval,
        alignment: config.snapToAlignment,
        snapToStart: config.snapToStart,
        snapToEnd: config.snapToEnd,
      },
    )
    if (target === undefined) return
    state.snapping = true
    domScrollTo(element, axis ? { x: target } : { y: target })
  }, [refreshEvent])

  const handleScroll = (event: UIEvent<HTMLElement>): void => {
    const element = event.currentTarget
    if (event.target !== element) return
    const state = sequence.current
    const scrollEvent = event as unknown as ScrollEvent
    Object.assign(scrollEvent.nativeEvent, describe(element))
    state.lastEvent = scrollEvent

    const config = snap.current
    const offset = config.horizontal ? element.scrollLeft : element.scrollTop
    const delta = offset - state.lastOffset
    state.lastOffset = offset

    if (state.phase === 'idle') {
      if (state.pointerDown) {
        state.phase = 'drag'
        handlers.current.onScrollBeginDrag?.(scrollEvent)
        if (config.keyboardDismissMode === 'on-drag') {
          const active = document.activeElement
          if (active instanceof HTMLElement && active !== document.body) active.blur()
        }
      } else {
        state.phase = 'momentum'
        handlers.current.onMomentumScrollBegin?.(scrollEvent)
      }
    } else if (state.phase === 'released') {
      state.phase = 'momentum'
      handlers.current.onMomentumScrollBegin?.(scrollEvent)
    }

    if (config.stickyHeaderHiddenOnScroll && !config.horizontal && delta !== 0) {
      const hidden = delta > 0
      for (const header of stickyHeaders.current) {
        header.style.transition = 'transform 150ms'
        header.style.transform = hidden ? 'translateY(-100%)' : ''
      }
    }

    handlers.current.onScroll?.(scrollEvent)

    if (!supportsScrollEnd) {
      if (state.timer !== undefined) clearTimeout(state.timer)
      state.timer = setTimeout(settle, SCROLL_END_DELAY)
    }
  }

  const handleScrollEnd = (event: UIEvent<HTMLElement>): void => {
    if (event.target !== event.currentTarget) return
    settle()
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    onPointerDown?.(event)
    const state = sequence.current
    if (state.pointerDown) return
    state.pointerDown = true

    const release = (): void => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
      state.pointerDown = false
      if (state.phase === 'drag') {
        state.phase = 'released'
        const scrollEvent = refreshEvent()
        if (scrollEvent !== null) handlers.current.onScrollEndDrag?.(scrollEvent)
      }
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
  }

  useEffect(() => {
    const state = sequence.current
    return () => {
      if (state.timer !== undefined) clearTimeout(state.timer)
    }
  }, [])

  const onContentLayout =
    onContentSizeChange === undefined
      ? undefined
      : (event: LayoutChangeEvent) =>
          onContentSizeChange(event.nativeEvent.layout.width, event.nativeEvent.layout.height)

  const stickySet =
    stickyHeaderIndices !== undefined && stickyHeaderIndices.length > 0 && !horizontal
      ? new Set(stickyHeaderIndices)
      : undefined
  const setStickyHeader = useCallback((node: HTMLElement | null) => {
    const list = stickyHeaders.current
    if (node === null) return
    if (!list.includes(node)) list.push(node)
    return () => {
      const index = list.indexOf(node)
      if (index !== -1) list.splice(index, 1)
    }
  }, [])

  let items: ReactNode = children
  if (stickySet !== undefined) {
    items = Children.toArray(children).map((child, index) =>
      stickySet.has(index) ? (
        <View
          key={isValidElement(child) && child.key !== null ? child.key : `sticky-${index}`}
          ref={setStickyHeader}
          style={invertStickyHeaders === true ? invertedStickyStyle : stickyStyle}
        >
          {child}
        </View>
      ) : (
        child
      ),
    )
  }

  const contentElement = (
    <View
      ref={content}
      onLayout={onContentLayout}
      style={[
        horizontal && horizontalContentStyle,
        centerContent === true && centerContentStyle,
        contentContainerStyle,
      ]}
    >
      {items}
    </View>
  )

  const hideScrollbar = horizontal ? !showsHorizontalScrollIndicator : !showsVerticalScrollIndicator

  // As on Android: the refresh control wraps the scroller, so it takes the props that place the
  // box, and the scroller fills it.
  const split =
    refreshControl === undefined ? undefined : splitLayoutProps(StyleSheet.flatten(style))

  const scrollerElement = useViewElement(
    {
      ...rest,
      ref: scroller,
      style: [
        scrollerStyle,
        horizontal && horizontalScrollerStyle,
        !scrollEnabled && disabledScrollerStyle,
        split === undefined ? style : split.inner,
      ],
      onScroll: handleScroll,
      onScrollEnd: handleScrollEnd,
      onPointerDown: handlePointerDown,
      children: contentElement,
    },
    hideScrollbar ? hiddenScrollbarClass(registry) : undefined,
  )

  // After useViewElement: its handle fills `scroller` in the same layout phase,
  // and layout effects run in hook order.
  const offsetX = contentOffset?.x
  const offsetY = contentOffset?.y
  useLayoutEffect(() => {
    const element = scroller.current
    if (element === null || (offsetX === undefined && offsetY === undefined)) return
    if (offsetX !== undefined) element.scrollLeft = offsetX
    if (offsetY !== undefined) element.scrollTop = offsetY
    sequence.current.lastOffset = horizontal ? element.scrollLeft : element.scrollTop
  }, [offsetX, offsetY, horizontal])

  useImperativeHandle(ref, () => {
    const element = scroller.current as HTMLElement
    const nativeScrollTo = element.scrollTo.bind(element)
    const instance = element as ScrollViewInstance
    const methods: Pick<
      ScrollViewInstance,
      | 'scrollTo'
      | 'scrollToEnd'
      | 'flashScrollIndicators'
      | 'getScrollResponder'
      | 'getScrollableNode'
      | 'getInnerViewNode'
      | 'getInnerViewRef'
      | 'getNativeScrollRef'
    > = {
      scrollTo: ((first?: unknown, second?: unknown) => {
        if (isReactNativeScrollTo(first)) domScrollTo(element, first)
        else if (typeof first === 'number' && typeof second === 'number') {
          nativeScrollTo(first, second)
        } else nativeScrollTo(first as globalThis.ScrollToOptions)
      }) as ScrollViewInstance['scrollTo'],
      scrollToEnd: (options) => {
        const animated = options?.animated
        domScrollTo(
          element,
          horizontal ? { x: element.scrollWidth, animated } : { y: element.scrollHeight, animated },
        )
      },
      flashScrollIndicators: () => {},
      getScrollResponder: () => instance,
      getScrollableNode: () => element,
      getInnerViewNode: () => content.current,
      getInnerViewRef: () => content.current,
      getNativeScrollRef: () => element,
    }
    return Object.assign(instance, methods)
  }, [horizontal])

  return refreshControl === undefined || split === undefined
    ? scrollerElement
    : cloneElement(
        refreshControl as ReactElement<{ style?: unknown }>,
        { style: [refreshAreaStyle, split.outer] },
        scrollerElement,
      )
}
