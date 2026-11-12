import {
  cloneElement,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react'

import type { StyleProp } from '../../style/types'
import { RefreshControl } from '../RefreshControl'
import { ScrollView } from '../ScrollView'
import type { ScrollEvent, ScrollViewInstance, ScrollViewProps } from '../ScrollView/types'
import { View } from '../View'
import type { LayoutChangeEvent } from '../View/types'
import type {
  CellRendererProps,
  FlatListInstance,
  FlatListProps,
  ListComponent,
  ListRenderItemInfo,
  ListSeparatorComponent,
  ListSeparatorProps,
  ListSeparators,
  ScrollToIndexParams,
  ViewableItemsChangedInfo,
  ViewToken,
} from './types'
import { ViewabilityTracker, type CellMetrics } from './viewability'

export type {
  CellRendererProps,
  FlatListInstance,
  FlatListProps,
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
} from './types'

const rowStyle = Object.freeze({ flexDirection: 'row' })
const rowReverseStyle = Object.freeze({ flexDirection: 'row-reverse' })
const columnReverseStyle = Object.freeze({ flexDirection: 'column-reverse' })
const verticallyInvertedStyle = Object.freeze({ transform: [{ scaleY: -1 }] })
const horizontallyInvertedStyle = Object.freeze({ transform: [{ scaleX: -1 }] })

// As in React Native: a distance this small from an edge counts as the edge.
const ON_EDGE_REACHED_EPSILON = 0.001
const DEFAULT_EDGE_THRESHOLD_PX = 2

type ItemStyle = StyleProp<Record<string, unknown>> | undefined

const defaultKeyExtractor = (item: unknown, index: number): string => {
  if (typeof item === 'object' && item !== null) {
    const record = item as { key?: unknown; id?: unknown }
    if (record.key != null) return String(record.key)
    if (record.id != null) return String(record.id)
  }
  return String(index)
}

const isArrayLike = <T,>(data: unknown): data is Readonly<ArrayLike<T>> =>
  data != null && typeof (data as ArrayLike<T>).length === 'number'

const renderListComponent = (component: ListComponent): ReactNode => {
  if (component == null) return null
  if (isValidElement(component)) return component
  const Component = component
  return <Component />
}

// With numColumns, the leading item is the row array, as in React Native.
type SeparatorProps<ItemT> = ListSeparatorProps<ItemT | ReadonlyArray<ItemT>>

type SeparatorUpdaters = Map<string, (next: Record<string, unknown>) => void>

type CellProps<ItemT> = {
  cellKey: string
  prevCellKey: string | undefined
  index: number
  item: ItemT | ReadonlyArray<ItemT>
  style: ItemStyle
  renderCell: (
    item: ItemT | ReadonlyArray<ItemT>,
    index: number,
    separators: ListSeparators,
  ) => ReactNode
  ItemSeparatorComponent: ListSeparatorComponent<ItemT>
  CellRendererComponent: ComponentType<CellRendererProps<ItemT>> | null | undefined
  separatorUpdaters: SeparatorUpdaters
  onElement: (index: number, node: HTMLElement | null) => void
}

// As in React Native, a custom scroller also gets the refresh props, to build its own control.
type CustomScrollerProps = ScrollViewProps &
  Pick<FlatListProps<unknown>, 'onRefresh' | 'refreshing' | 'progressViewOffset'> & {
    render: (props: ScrollViewProps) => ReactElement<ScrollViewProps>
  }

// Calls `renderScrollComponent` in a render of its own. A call in the FlatList
// render would hand it handlers that read refs.
function CustomScroller({ render, ref, ...props }: CustomScrollerProps): ReactElement {
  return cloneElement(render(props), { ref }, props.children)
}

function Cell<ItemT>(props: CellProps<ItemT>): ReactElement {
  const {
    cellKey,
    prevCellKey,
    index,
    item,
    style,
    renderCell,
    ItemSeparatorComponent,
    CellRendererComponent,
    separatorUpdaters,
    onElement,
  } = props

  const [separatorProps, setSeparatorProps] = useState<SeparatorProps<ItemT>>({
    highlighted: false,
    leadingItem: item,
  })
  const shown =
    separatorProps.leadingItem === item ? separatorProps : { ...separatorProps, leadingItem: item }

  useEffect(() => {
    separatorUpdaters.set(cellKey, (next) => {
      setSeparatorProps((current) => ({ ...current, ...next }) as SeparatorProps<ItemT>)
    })
    return () => {
      separatorUpdaters.delete(cellKey)
    }
  }, [cellKey, separatorUpdaters])

  const separators = useMemo<ListSeparators>(() => {
    const update = (keys: ReadonlyArray<string | undefined>, next: Record<string, unknown>) => {
      for (const key of keys) {
        if (key !== undefined) separatorUpdaters.get(key)?.(next)
      }
    }
    return {
      highlight: () => update([cellKey, prevCellKey], { highlighted: true }),
      unhighlight: () => update([cellKey, prevCellKey], { highlighted: false }),
      updateProps: (select, next) => update([select === 'leading' ? prevCellKey : cellKey], next),
    }
  }, [cellKey, prevCellKey, separatorUpdaters])

  const setElement = useCallback(
    (node: HTMLElement | null) => {
      if (node === null) return
      onElement(index, node)
      return () => onElement(index, null)
    },
    [index, onElement],
  )

  let separator: ReactNode = null
  if (ItemSeparatorComponent != null) {
    if (isValidElement(ItemSeparatorComponent)) separator = ItemSeparatorComponent
    else {
      const Separator = ItemSeparatorComponent as ComponentType<SeparatorProps<ItemT>>
      separator = <Separator {...shown} />
    }
  }
  const element = renderCell(item, index, separators)

  if (CellRendererComponent != null) {
    // The measuring View stays outside, so the list can read the cell's
    // offset without a layout callback from the custom component.
    return (
      <View ref={setElement}>
        <CellRendererComponent cellKey={cellKey} index={index} item={item as ItemT} style={style}>
          {element}
          {separator}
        </CellRendererComponent>
      </View>
    )
  }
  return (
    <View ref={setElement} style={style}>
      {element}
      {separator}
    </View>
  )
}

type TrackerEntry<ItemT> = {
  tracker: ViewabilityTracker<ItemT | ReadonlyArray<ItemT>>
  callback: (
    props: FlatListProps<ItemT>,
  ) => ((info: ViewableItemsChangedInfo<ItemT>) => void) | null | undefined
}

const createTrackers = <ItemT,>(props: FlatListProps<ItemT>): Array<TrackerEntry<ItemT>> => {
  if (props.viewabilityConfigCallbackPairs !== undefined) {
    return props.viewabilityConfigCallbackPairs.map((pair) => ({
      tracker: new ViewabilityTracker(pair.viewabilityConfig),
      callback: () => pair.onViewableItemsChanged,
    }))
  }
  if (props.onViewableItemsChanged != null) {
    return [
      {
        tracker: new ViewabilityTracker(props.viewabilityConfig),
        callback: (latest) => latest.onViewableItemsChanged,
      },
    ]
  }
  return []
}

export function FlatList<ItemT>(props: FlatListProps<ItemT>): ReactElement {
  const {
    data,
    renderItem,
    ListItemComponent,
    keyExtractor = defaultKeyExtractor,
    getItemLayout: _getItemLayout,
    numColumns = 1,
    columnWrapperStyle,
    inverted,
    initialScrollIndex: _initialScrollIndex,
    ItemSeparatorComponent,
    ListEmptyComponent,
    ListHeaderComponent,
    ListHeaderComponentStyle,
    ListFooterComponent,
    ListFooterComponentStyle,
    CellRendererComponent,
    renderScrollComponent,
    horizontal = false,
    style,
    ref,
    onScroll: _onScroll,
    onContentSizeChange: _onContentSizeChange,
    onLayout: _onLayout,
    onEndReached: _onEndReached,
    onEndReachedThreshold: _onEndReachedThreshold,
    onStartReached: _onStartReached,
    onStartReachedThreshold: _onStartReachedThreshold,
    onViewableItemsChanged: _onViewableItemsChanged,
    viewabilityConfig: _viewabilityConfig,
    viewabilityConfigCallbackPairs: _viewabilityConfigCallbackPairs,
    onScrollToIndexFailed: _onScrollToIndexFailed,
    onRefresh,
    refreshing,
    progressViewOffset,
    // Not shipped yet, or ignored on the web.
    extraData: _extraData,
    debug: _debug,
    disableVirtualization: _disableVirtualization,
    initialNumToRender: _initialNumToRender,
    maxToRenderPerBatch: _maxToRenderPerBatch,
    strictMode: _strictMode,
    updateCellsBatchingPeriod: _updateCellsBatchingPeriod,
    windowSize: _windowSize,
    legacyImplementation: _legacyImplementation,
    ...scrollViewProps
  } = props

  if (numColumns > 1 && horizontal) {
    throw new Error('numColumns does not support horizontal.')
  }

  // The latest props, for the handlers and the instance methods.
  const latest = useRef(props)
  useEffect(() => {
    latest.current = props
  })

  const scroller = useRef<ScrollViewInstance | null>(null)
  const [cells] = useState(() => new Map<number, HTMLElement>())
  const [separatorUpdaters] = useState<SeparatorUpdaters>(() => new Map())
  const [trackers] = useState(() => createTrackers(props))
  const edge = useRef({ sentEndForContentLength: 0, sentStartForContentLength: 0 })

  useEffect(() => {
    return () => {
      for (const entry of trackers) entry.tracker.dispose()
    }
  }, [trackers])

  const onElement = useCallback(
    (index: number, node: HTMLElement | null) => {
      if (node === null) cells.delete(index)
      else cells.set(index, node)
    },
    [cells],
  )

  const items: Readonly<ArrayLike<ItemT>> = isArrayLike<ItemT>(data) ? data : []
  const rowCount = numColumns > 1 ? Math.ceil(items.length / numColumns) : items.length

  const rowAt = (index: number): ItemT | ReadonlyArray<ItemT> => {
    if (numColumns === 1) return items[index] as ItemT
    const row: ItemT[] = []
    for (let column = 0; column < numColumns; column++) {
      const itemIndex = index * numColumns + column
      if (itemIndex < items.length) row.push(items[itemIndex] as ItemT)
    }
    return row
  }

  const rowKey = (row: ItemT | ReadonlyArray<ItemT>, index: number): string => {
    if (numColumns === 1) return keyExtractor(row as ItemT, index)
    return (row as ReadonlyArray<ItemT>)
      .map((item, column) => keyExtractor(item, index * numColumns + column))
      .join(':')
  }

  const metricsAt = useCallback(
    (index: number): CellMetrics | undefined => {
      const element = cells.get(index)
      const { horizontal: isHorizontal = false, getItemLayout, data: currentData } = latest.current
      if (element !== undefined) {
        return isHorizontal
          ? { offset: element.offsetLeft, length: element.offsetWidth }
          : { offset: element.offsetTop, length: element.offsetHeight }
      }
      const layout = getItemLayout?.(currentData, index)
      return layout === undefined ? undefined : { offset: layout.offset, length: layout.length }
    },
    [cells],
  )

  const maybeCallOnEdgeReached = useCallback((): void => {
    const element = scroller.current
    if (element === null) return
    const {
      horizontal: isHorizontal = false,
      onEndReached,
      onEndReachedThreshold,
      onStartReached,
      onStartReachedThreshold,
    } = latest.current
    const visibleLength = isHorizontal ? element.clientWidth : element.clientHeight
    const contentLength = isHorizontal ? element.scrollWidth : element.scrollHeight
    if (visibleLength === 0 || contentLength === 0) return

    const offset = isHorizontal ? element.scrollLeft : element.scrollTop
    let distanceFromStart = offset
    let distanceFromEnd = contentLength - visibleLength - offset
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
    const withinStart = distanceFromStart <= startThreshold
    const withinEnd = distanceFromEnd <= endThreshold

    const state = edge.current
    if (onEndReached != null && withinEnd && contentLength !== state.sentEndForContentLength) {
      state.sentEndForContentLength = contentLength
      onEndReached({ distanceFromEnd })
    }
    if (
      onStartReached != null &&
      withinStart &&
      contentLength !== state.sentStartForContentLength
    ) {
      state.sentStartForContentLength = contentLength
      onStartReached({ distanceFromStart })
    }
    if (!withinStart) state.sentStartForContentLength = 0
    if (!withinEnd) state.sentEndForContentLength = 0
  }, [])

  const updateViewability = useCallback((): void => {
    const element = scroller.current
    if (element === null || trackers.length === 0) return
    const current = latest.current
    const isHorizontal = current.horizontal === true
    const columns = current.numColumns ?? 1
    const extract = current.keyExtractor ?? defaultKeyExtractor
    const currentItems: Readonly<ArrayLike<ItemT>> = isArrayLike<ItemT>(current.data)
      ? current.data
      : []
    const count = columns > 1 ? Math.ceil(currentItems.length / columns) : currentItems.length

    const createToken = (
      index: number,
      isViewable: boolean,
    ): ViewToken<ItemT | ReadonlyArray<ItemT>> => {
      if (columns === 1) {
        const item = currentItems[index] as ItemT
        return { item, key: extract(item, index), index, isViewable }
      }
      const row: ItemT[] = []
      for (let column = 0; column < columns; column++) {
        const itemIndex = index * columns + column
        if (itemIndex < currentItems.length) row.push(currentItems[itemIndex] as ItemT)
      }
      const key = row.map((item, column) => extract(item, index * columns + column)).join(':')
      return { item: row, key, index, isViewable }
    }

    // A multi-column row token becomes one token per item, as in React Native.
    const expand = (
      tokens: ReadonlyArray<ViewToken<ItemT | ReadonlyArray<ItemT>>>,
    ): Array<ViewToken<ItemT>> => {
      if (columns === 1) return tokens as Array<ViewToken<ItemT>>
      const out: Array<ViewToken<ItemT>> = []
      for (const token of tokens) {
        const row = token.item as ReadonlyArray<ItemT>
        row.forEach((item, column) => {
          const index = (token.index ?? 0) * columns + column
          out.push({ ...token, item, key: extract(item, index), index })
        })
      }
      return out
    }

    const offset = isHorizontal ? element.scrollLeft : element.scrollTop
    const viewport = isHorizontal ? element.clientWidth : element.clientHeight
    for (const entry of trackers) {
      const handler = entry.callback(current)
      if (handler == null) continue
      entry.tracker.onUpdate(count, metricsAt, offset, viewport, createToken, (info) => {
        handler({ viewableItems: expand(info.viewableItems), changed: expand(info.changed) })
      })
    }
  }, [metricsAt, trackers])

  const handleScroll = useCallback(
    (event: ScrollEvent): void => {
      latest.current.onScroll?.(event)
      maybeCallOnEdgeReached()
      updateViewability()
    },
    [maybeCallOnEdgeReached, updateViewability],
  )

  const handleContentSizeChange = useCallback(
    (width: number, height: number): void => {
      latest.current.onContentSizeChange?.(width, height)
      maybeCallOnEdgeReached()
      updateViewability()
    },
    [maybeCallOnEdgeReached, updateViewability],
  )

  const handleLayout = useCallback(
    (event: LayoutChangeEvent): void => {
      latest.current.onLayout?.(event)
      maybeCallOnEdgeReached()
      updateViewability()
    },
    [maybeCallOnEdgeReached, updateViewability],
  )

  // A data change can swap the viewable items without a scroll.
  useEffect(() => {
    updateViewability()
  })

  const scrollToOffset = useCallback((offset: number, animated: boolean | undefined): void => {
    const element = scroller.current
    if (element === null) return
    element.scrollTo(
      latest.current.horizontal === true ? { x: offset, animated } : { y: offset, animated },
    )
  }, [])

  const scrollToIndex = useCallback(
    (params: ScrollToIndexParams): void => {
      const current = latest.current
      const columns = current.numColumns ?? 1
      const currentItems = isArrayLike<ItemT>(current.data) ? current.data : []
      const count = columns > 1 ? Math.ceil(currentItems.length / columns) : currentItems.length
      const { animated, index, viewOffset, viewPosition } = params
      if (index < 0) {
        throw new Error(`scrollToIndex out of range: requested index ${index} but minimum is 0`)
      }
      if (count < 1) {
        throw new Error(`scrollToIndex out of range: item length ${count} but minimum is 1`)
      }
      if (index >= count) {
        throw new Error(
          `scrollToIndex out of range: requested index ${index} is out of 0 to ${count - 1}`,
        )
      }
      const frame = metricsAt(Math.floor(index))
      const element = scroller.current
      if (frame === undefined || element === null) {
        const { onScrollToIndexFailed } = current
        if (onScrollToIndexFailed === undefined) {
          throw new Error(
            'scrollToIndex should be used in conjunction with getItemLayout or onScrollToIndexFailed, ' +
              'otherwise there is no way to know the location of offscreen indices or handle failures.',
          )
        }
        onScrollToIndexFailed({ index, highestMeasuredFrameIndex: -1, averageItemLength: 0 })
        return
      }
      const visibleLength = current.horizontal === true ? element.clientWidth : element.clientHeight
      const offset =
        Math.max(0, frame.offset - (viewPosition ?? 0) * (visibleLength - frame.length)) -
        (viewOffset ?? 0)
      scrollToOffset(offset, animated)
    },
    [metricsAt, scrollToOffset],
  )

  useImperativeHandle(
    ref,
    (): FlatListInstance<ItemT> => ({
      scrollToOffset: (params) => scrollToOffset(params.offset, params.animated),
      scrollToEnd: (params) => scroller.current?.scrollToEnd({ animated: params?.animated }),
      scrollToIndex,
      scrollToItem: ({ item, ...rest }) => {
        const current = latest.current
        const columns = current.numColumns ?? 1
        const currentItems = isArrayLike<ItemT>(current.data) ? current.data : []
        for (let index = 0; index < currentItems.length; index++) {
          if (currentItems[index] === item) {
            scrollToIndex({ ...rest, index: Math.floor(index / columns) })
            return
          }
        }
      },
      recordInteraction: () => {
        for (const entry of trackers) entry.tracker.recordInteraction()
        updateViewability()
      },
      flashScrollIndicators: () => {},
      getScrollResponder: () => scroller.current,
      getNativeScrollRef: () => scroller.current,
      getScrollableNode: () => scroller.current,
      setNativeProps: () => {},
    }),
    [scrollToIndex, scrollToOffset, trackers, updateViewability],
  )

  // The cells attach their elements in their own ref callbacks, which run
  // before this layout effect of the parent.
  useLayoutEffect(() => {
    const index = latest.current.initialScrollIndex
    const element = scroller.current
    if (index == null || element === null) return
    const frame = metricsAt(index)
    if (frame === undefined) return
    if (latest.current.horizontal === true) element.scrollLeft = frame.offset
    else element.scrollTop = frame.offset
  }, [metricsAt])

  const inversionStyle = inverted
    ? horizontal
      ? horizontallyInvertedStyle
      : verticallyInvertedStyle
    : undefined
  const cellStyle: ItemStyle = inversionStyle
    ? horizontal
      ? [rowReverseStyle, inversionStyle]
      : [columnReverseStyle, inversionStyle]
    : horizontal
      ? rowStyle
      : undefined

  const renderOne = (info: ListRenderItemInfo<ItemT>): ReactNode => {
    if (ListItemComponent !== undefined) return <ListItemComponent {...info} />
    if (renderItem != null) return renderItem(info)
    throw new Error(
      'FlatList: Either ListItemComponent or renderItem props are required but none were found.',
    )
  }

  const renderCell = (
    row: ItemT | ReadonlyArray<ItemT>,
    index: number,
    separators: ListSeparators,
  ): ReactNode => {
    if (numColumns === 1) return renderOne({ item: row as ItemT, index, separators })
    return (
      <View style={[rowStyle, columnWrapperStyle]}>
        {(row as ReadonlyArray<ItemT>).map((item, column) => {
          const element = renderOne({ item, index: index * numColumns + column, separators })
          return element == null ? null : <Fragment key={column}>{element}</Fragment>
        })}
      </View>
    )
  }

  const children: ReactNode[] = []
  if (ListHeaderComponent != null) {
    children.push(
      <View key="$header" style={[inversionStyle, ListHeaderComponentStyle]}>
        {renderListComponent(ListHeaderComponent)}
      </View>,
    )
  }
  if (rowCount === 0) {
    if (ListEmptyComponent != null) {
      children.push(
        <View key="$empty" style={inversionStyle}>
          {renderListComponent(ListEmptyComponent)}
        </View>,
      )
    }
  } else {
    let prevCellKey: string | undefined
    for (let index = 0; index < rowCount; index++) {
      const row = rowAt(index)
      const cellKey = rowKey(row, index)
      children.push(
        <Cell<ItemT>
          key={cellKey}
          cellKey={cellKey}
          prevCellKey={prevCellKey}
          index={index}
          item={row}
          style={cellStyle}
          renderCell={renderCell}
          ItemSeparatorComponent={index < rowCount - 1 ? ItemSeparatorComponent : undefined}
          CellRendererComponent={CellRendererComponent}
          separatorUpdaters={separatorUpdaters}
          onElement={onElement}
        />,
      )
      prevCellKey = cellKey
    }
  }
  if (ListFooterComponent != null) {
    children.push(
      <View key="$footer" style={[inversionStyle, ListFooterComponentStyle]}>
        {renderListComponent(ListFooterComponent)}
      </View>,
    )
  }

  const scrollProps: ScrollViewProps = {
    ...scrollViewProps,
    horizontal,
    style: [inversionStyle, style],
    onScroll: handleScroll,
    onContentSizeChange: handleContentSizeChange,
    onLayout: handleLayout,
    children,
  }

  if (renderScrollComponent !== undefined) {
    return (
      <CustomScroller
        {...scrollProps}
        onRefresh={onRefresh}
        refreshing={refreshing}
        progressViewOffset={progressViewOffset}
        ref={scroller}
        render={renderScrollComponent}
      />
    )
  }

  // React Native's `_defaultRenderScrollComponent`: a `refreshControl` of the app wins.
  let refreshControl = scrollProps.refreshControl
  if (onRefresh != null) {
    if (typeof refreshing !== 'boolean') {
      throw new Error(
        '`refreshing` prop must be set as a boolean in order to use `onRefresh`, but got `' +
          JSON.stringify(refreshing ?? 'undefined') +
          '`',
      )
    }
    refreshControl ??= (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        progressViewOffset={progressViewOffset}
      />
    )
  }
  return <ScrollView {...scrollProps} refreshControl={refreshControl} ref={scroller} />
}
