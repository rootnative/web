/**
 * @license MIT
 * A port of `Libraries/Lists/FlatList.js` of React Native 0.88.1, Copyright (c) Meta Platforms,
 * Inc. and affiliates.
 */

import {
  Fragment,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react'

import { StyleSheet } from '../../apis/StyleSheet'
import type { ViewStyle } from '../../apis/StyleSheet/types'
import type { StyleProp } from '../../style/types'
import { invariant } from '../../utils/invariant'
import { View } from '../View'
import { VirtualizedList } from '../VirtualizedList'
import type {
  CellRendererProps,
  ListRenderItem,
  ListRenderItemInfo,
  ListSeparatorComponent,
  ViewabilityConfig,
  ViewabilityConfigCallbackPairs,
  ViewableItemsChangedInfo,
  ViewToken,
  VirtualizedListInstance,
} from '../VirtualizedList/types'
import { keyExtractor as defaultKeyExtractor } from '../VirtualizedList/VirtualizeUtils'
import type { FlatListInstance, FlatListProps } from './types'

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

const defaultViewabilityConfig: ViewabilityConfig = Object.freeze({
  viewAreaCoveragePercentThreshold: 0,
})

// With numColumns above 1, a row of the list is an array of items.
type Row<ItemT> = ItemT | ItemT[]

type KeyExtractor<ItemT> = (item: ItemT, index: number) => string

const isArrayLike = (data: unknown): data is ArrayLike<unknown> =>
  typeof (Object(data) as { length?: unknown }).length === 'number'

// The latest props, for the callbacks that the list keeps from its first render.
class Latest<T> {
  value: T

  constructor(value: T) {
    this.value = value
  }

  set(value: T): void {
    this.value = value
  }
}

const checkProps = <ItemT,>(props: FlatListProps<ItemT>, numColumns: number): void => {
  const custom = props as { getItem?: unknown; getItemCount?: unknown }
  invariant(
    !custom.getItem && !custom.getItemCount,
    'FlatList does not support custom data formats.',
  )
  if (numColumns > 1) {
    invariant(!props.horizontal, 'numColumns does not support horizontal.')
  } else {
    invariant(!props.columnWrapperStyle, 'columnWrapperStyle not supported for single column lists')
  }
  invariant(
    !(props.onViewableItemsChanged && props.viewabilityConfigCallbackPairs),
    'FlatList does not support setting both onViewableItemsChanged and ' +
      'viewabilityConfigCallbackPairs.',
  )
}

const sameConfig = (a?: ViewabilityConfig, b?: ViewabilityConfig): boolean => {
  if (a === b) return true
  if (a == null || b == null) return false
  const keys = new Set([...Object.keys(a), ...Object.keys(b)] as Array<keyof ViewabilityConfig>)
  return [...keys].every((key) => a[key] === b[key])
}

const createAccessors = <ItemT,>(numColumns: number, keyExtractor?: KeyExtractor<ItemT>) => {
  const extract = keyExtractor ?? defaultKeyExtractor
  return {
    getItem: (data: ArrayLike<ItemT>, index: number): Row<ItemT> => {
      if (numColumns <= 1) return data[index] as ItemT
      const row: ItemT[] = []
      for (let column = 0; column < numColumns; column++) {
        const itemIndex = index * numColumns + column
        if (itemIndex < data.length) row.push(data[itemIndex] as ItemT)
      }
      return row
    },
    // Data that isn't array-like counts as no items, so the list reads nothing from it.
    getItemCount: (data: unknown): number => {
      if (data == null || !isArrayLike(data)) return 0
      return numColumns > 1 ? Math.ceil(data.length / numColumns) : data.length
    },
    keyExtractor: (row: Row<ItemT>, index: number): string => {
      if (numColumns <= 1) return extract(row as ItemT, index)
      invariant(
        Array.isArray(row),
        'FlatList: Encountered internal consistency error, expected each item to consist of an ' +
          `array with 1-${numColumns} columns; instead, received a single item.`,
      )
      return row.map((item: ItemT, column) => extract(item, index * numColumns + column)).join(':')
    },
  }
}

// One renderItem for the list. ListItemComponent renders as an element in it, so a new render of
// the FlatList doesn't remount the items.
const createRenderRow = <ItemT,>(
  ListItemComponent: ComponentType<ListRenderItemInfo<ItemT>> | undefined,
  renderItem: ListRenderItem<ItemT> | null | undefined,
  columnWrapperStyle: StyleProp<ViewStyle> | undefined,
  numColumns: number,
): ListRenderItem<Row<ItemT>> => {
  const render = (info: ListRenderItemInfo<ItemT>): ReactNode => {
    if (ListItemComponent != null) return <ListItemComponent {...info} />
    if (renderItem != null) return renderItem(info)
    return null
  }
  return (info) => {
    if (numColumns <= 1) return render(info as ListRenderItemInfo<ItemT>)
    const { item, index, separators } = info
    invariant(Array.isArray(item), 'Expected array of items with numColumns > 1')
    return (
      <View style={StyleSheet.compose(rowStyle, columnWrapperStyle)}>
        {item.map((columnItem: ItemT, column) => {
          const element = render({
            item: columnItem,
            index: index * numColumns + column,
            separators,
          })
          // A column is a position in the row, so its index is the right key.
          // oxlint-disable-next-line react/no-array-index-key
          return element == null ? null : <Fragment key={column}>{element}</Fragment>
        })}
      </View>
    )
  }
}

// With numColumns, the list reports rows. Each row becomes one token for each of its items.
const expandColumns =
  <ItemT,>(
    latest: Latest<FlatListProps<ItemT>>,
    handler: ((info: ViewableItemsChangedInfo<ItemT>) => void) | null | undefined,
  ) =>
  (info: ViewableItemsChangedInfo<Row<ItemT>>): void => {
    if (handler == null) return
    const numColumns = latest.value.numColumns ?? 1
    if (numColumns <= 1) {
      handler(info as ViewableItemsChangedInfo<ItemT>)
      return
    }
    const extract = latest.value.keyExtractor ?? defaultKeyExtractor
    const expand = (tokens: Array<ViewToken<Row<ItemT>>>): Array<ViewToken<ItemT>> => {
      const out: Array<ViewToken<ItemT>> = []
      for (const token of tokens) {
        const rowIndex = token.index
        invariant(rowIndex != null, 'Missing index!')
        ;(token.item as ItemT[]).forEach((item, column) => {
          const index = rowIndex * numColumns + column
          out.push({ ...token, item, key: extract(item, index), index })
        })
      }
      return out
    }
    handler({ viewableItems: expand(info.viewableItems), changed: expand(info.changed) })
  }

const createPairs = <ItemT,>(
  props: FlatListProps<ItemT>,
  latest: Latest<FlatListProps<ItemT>>,
): ViewabilityConfigCallbackPairs<Row<ItemT>> => {
  if (props.viewabilityConfigCallbackPairs) {
    return props.viewabilityConfigCallbackPairs.map((pair) => ({
      viewabilityConfig: pair.viewabilityConfig,
      onViewableItemsChanged: expandColumns(latest, pair.onViewableItemsChanged),
    }))
  }
  if (props.onViewableItemsChanged) {
    return [
      {
        viewabilityConfig: props.viewabilityConfig ?? defaultViewabilityConfig,
        // A wrapper, so the app can pass a new callback and the list keeps its tracker.
        onViewableItemsChanged: expandColumns(latest, (info) => {
          const { onViewableItemsChanged } = latest.value
          invariant(
            onViewableItemsChanged,
            'Changing the nullability of onViewableItemsChanged is not supported. ' +
              'Once a function or null is supplied that cannot be changed.',
          )
          onViewableItemsChanged(info)
        }),
      },
    ]
  }
  return []
}

export function FlatList<ItemT>(props: FlatListProps<ItemT>): ReactElement {
  const {
    ref,
    data,
    numColumns: numColumnsProp,
    columnWrapperStyle,
    renderItem,
    ListItemComponent,
    keyExtractor,
    CellRendererComponent,
    ItemSeparatorComponent,
    // The pairs read these.
    onViewableItemsChanged: _onViewableItemsChanged,
    viewabilityConfig: _viewabilityConfig,
    viewabilityConfigCallbackPairs: _viewabilityConfigCallbackPairs,
    // Accepted and ignored.
    strictMode: _strictMode,
    legacyImplementation: _legacyImplementation,
    ...rest
  } = props
  const numColumns = numColumnsProp ?? 1
  checkProps(props, numColumns)

  const [latest] = useState(() => new Latest(props))
  const [pairs] = useState(() => createPairs(props, latest))
  const list = useRef<VirtualizedListInstance<Row<ItemT>>>(null)

  useLayoutEffect(() => {
    const previous = latest.value
    latest.set(props)
    invariant(
      previous.numColumns === props.numColumns,
      'Changing numColumns on the fly is not supported. Change the key prop on FlatList when ' +
        'changing the number of columns to force a fresh render of the component.',
    )
    invariant(
      (previous.onViewableItemsChanged == null) === (props.onViewableItemsChanged == null),
      'Changing onViewableItemsChanged nullability on the fly is not supported',
    )
    invariant(
      sameConfig(previous.viewabilityConfig, props.viewabilityConfig),
      'Changing viewabilityConfig on the fly is not supported',
    )
    invariant(
      previous.viewabilityConfigCallbackPairs === props.viewabilityConfigCallbackPairs,
      'Changing viewabilityConfigCallbackPairs on the fly is not supported',
    )
  })

  const accessors = useMemo(
    () => createAccessors(numColumns, keyExtractor),
    [numColumns, keyExtractor],
  )
  const renderRow = useMemo(
    () => createRenderRow(ListItemComponent, renderItem, columnWrapperStyle, numColumns),
    [ListItemComponent, renderItem, columnWrapperStyle, numColumns],
  )

  useImperativeHandle(
    ref,
    (): FlatListInstance<ItemT> => ({
      scrollToEnd: (params) => list.current?.scrollToEnd(params),
      scrollToIndex: (params) => list.current?.scrollToIndex(params),
      // React Native compares the rows with the item, so with numColumns it never finds one.
      // This finds the item in the data and scrolls to its row.
      scrollToItem: ({ item, ...params }) => {
        const { data: items, numColumns: columns = 1 } = latest.value
        if (items == null || !isArrayLike(items)) return
        for (let index = 0; index < items.length; index++) {
          if (items[index] === item) {
            list.current?.scrollToIndex({ ...params, index: Math.floor(index / columns) })
            return
          }
        }
      },
      scrollToOffset: (params) => list.current?.scrollToOffset(params),
      recordInteraction: () => list.current?.recordInteraction(),
      flashScrollIndicators: () => list.current?.flashScrollIndicators(),
      getScrollResponder: () => list.current?.getScrollResponder() ?? null,
      getNativeScrollRef: () => list.current?.getScrollRef() ?? null,
      getScrollableNode: () => list.current?.getScrollableNode() ?? null,
      setNativeProps: (nativeProps) => list.current?.setNativeProps(nativeProps),
    }),
    [latest],
  )

  return (
    <VirtualizedList<Row<ItemT>>
      {...rest}
      ref={list}
      data={data}
      getItem={accessors.getItem}
      getItemCount={accessors.getItemCount}
      keyExtractor={accessors.keyExtractor}
      renderItem={renderRow}
      viewabilityConfigCallbackPairs={pairs}
      CellRendererComponent={
        CellRendererComponent as ComponentType<CellRendererProps<Row<ItemT>>> | null | undefined
      }
      ItemSeparatorComponent={ItemSeparatorComponent as ListSeparatorComponent<Row<ItemT>>}
    />
  )
}
