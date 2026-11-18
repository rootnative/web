/**
 * @license MIT
 * A port of `Lists/VirtualizedListCellRenderer.js` of `@react-native/virtualized-lists` 0.88.1,
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 */

import {
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react'

import type { ViewStyle } from '../../apis/StyleSheet/types'
import type { StyleProp } from '../../style/types'
import { invariant } from '../../utils/invariant'
import { warnOnce } from '../../utils/warn'
import { View } from '../View'
import { VirtualizedListCellContextProvider } from './VirtualizedListContext'
import type {
  CellRendererProps,
  ListRenderItem,
  ListRenderItemInfo,
  ListSeparatorComponent,
  ListSeparatorProps,
  ListSeparators,
} from './types'

export type SeparatorUpdaters = Map<string, (next: Record<string, unknown>) => void>

export const verticallyInvertedStyle: Readonly<ViewStyle> = Object.freeze({
  transform: [{ scaleY: -1 }],
})
export const horizontallyInvertedStyle: Readonly<ViewStyle> = Object.freeze({
  transform: [{ scaleX: -1 }],
})

const rowStyle = Object.freeze({ flexDirection: 'row' })
const verticallyInvertedCellStyle: StyleProp<ViewStyle> = [
  Object.freeze({ flexDirection: 'column-reverse' }),
  verticallyInvertedStyle,
]
const horizontallyInvertedCellStyle: StyleProp<ViewStyle> = [
  Object.freeze({ flexDirection: 'row-reverse' }),
  horizontallyInvertedStyle,
]

const cellStyleFor = (horizontal: boolean, inverted: boolean): StyleProp<ViewStyle> => {
  if (inverted) return horizontal ? horizontallyInvertedCellStyle : verticallyInvertedCellStyle
  return horizontal ? rowStyle : undefined
}

export type CellProps<ItemT> = {
  CellRendererComponent: ComponentType<CellRendererProps<ItemT>> | null | undefined
  ItemSeparatorComponent: ListSeparatorComponent<ItemT>
  ListItemComponent: ComponentType<ListRenderItemInfo<ItemT>> | null | undefined
  cellKey: string
  horizontal: boolean
  index: number
  inverted: boolean
  item: ItemT
  prevCellKey: string | undefined
  renderItem: ListRenderItem<ItemT> | null | undefined
  separatorUpdaters: SeparatorUpdaters
  onCellElement: (cellKey: string, index: number, element: HTMLElement | null) => void
  onCellFocusCapture: (cellKey: string) => void
  onUnmount: (cellKey: string) => void
}

const renderElement = <ItemT,>(
  renderItem: ListRenderItem<ItemT> | null | undefined,
  ListItemComponent: ComponentType<ListRenderItemInfo<ItemT>> | null | undefined,
  info: ListRenderItemInfo<ItemT>,
): ReactNode => {
  if (renderItem != null && ListItemComponent != null) {
    warnOnce(
      'VirtualizedList.ListItemComponent',
      'VirtualizedList: Both ListItemComponent and renderItem props are present. ' +
        'ListItemComponent will take precedence over renderItem.',
    )
  }
  if (ListItemComponent != null) return <ListItemComponent {...info} />
  invariant(
    renderItem != null,
    'VirtualizedList: Either ListItemComponent or renderItem props are required but none were found.',
  )
  return renderItem(info)
}

export function CellRenderer<ItemT>(props: CellProps<ItemT>): ReactElement {
  const {
    CellRendererComponent,
    ItemSeparatorComponent,
    ListItemComponent,
    cellKey,
    horizontal,
    index,
    inverted,
    item,
    prevCellKey,
    renderItem,
    separatorUpdaters,
    onCellElement,
    onCellFocusCapture,
    onUnmount,
  } = props

  const [separatorProps, setSeparatorProps] = useState<ListSeparatorProps<ItemT>>({
    highlighted: false,
    leadingItem: item,
  })
  const shown =
    separatorProps.leadingItem === item ? separatorProps : { ...separatorProps, leadingItem: item }

  useEffect(() => {
    separatorUpdaters.set(cellKey, (next) => {
      setSeparatorProps((current) => ({ ...current, ...next }) as ListSeparatorProps<ItemT>)
    })
    return () => {
      separatorUpdaters.delete(cellKey)
    }
  }, [cellKey, separatorUpdaters])

  useEffect(() => () => onUnmount(cellKey), [cellKey, onUnmount])

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
      onCellElement(cellKey, index, node)
      return () => onCellElement(cellKey, index, null)
    },
    [cellKey, index, onCellElement],
  )

  const handleFocusCapture = useCallback(
    () => onCellFocusCapture(cellKey),
    [cellKey, onCellFocusCapture],
  )

  let separator: ReactNode = null
  if (isValidElement(ItemSeparatorComponent)) separator = ItemSeparatorComponent
  else if (ItemSeparatorComponent != null) {
    const Separator = ItemSeparatorComponent as ComponentType<ListSeparatorProps<ItemT>>
    separator = <Separator {...shown} />
  }
  const element = renderElement(renderItem, ListItemComponent, { item, index, separators })

  const cellStyle = cellStyleFor(horizontal, inverted)

  if (CellRendererComponent != null) {
    // The measuring View stays outside, so the list reads the offset of the cell with no layout
    // callback from the custom component.
    return (
      <VirtualizedListCellContextProvider cellKey={cellKey}>
        <View ref={setElement} onFocusCapture={handleFocusCapture}>
          <CellRendererComponent cellKey={cellKey} index={index} item={item} style={cellStyle}>
            {element}
            {separator}
          </CellRendererComponent>
        </View>
      </VirtualizedListCellContextProvider>
    )
  }
  return (
    <VirtualizedListCellContextProvider cellKey={cellKey}>
      <View ref={setElement} style={cellStyle} onFocusCapture={handleFocusCapture}>
        {element}
        {separator}
      </View>
    </VirtualizedListCellContextProvider>
  )
}
