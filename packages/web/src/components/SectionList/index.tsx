/**
 * @license MIT
 * A port of `Libraries/Lists/SectionList.js` of React Native 0.88.1, Copyright (c) Meta Platforms,
 * Inc. and affiliates.
 */

import { useImperativeHandle, useRef, type ReactElement } from 'react'

import { VirtualizedSectionList } from '../VirtualizedSectionList'
import type {
  DefaultSectionT,
  VirtualizedSectionListInstance,
  VirtualizedSectionListProps,
} from '../VirtualizedSectionList/types'
import type { SectionListInstance, SectionListProps } from './types'

export type {
  SectionListData,
  SectionListInstance,
  SectionListProps,
  SectionListRenderItem,
  SectionListRenderItemInfo,
} from './types'

const getArrayItem = (items: ArrayLike<unknown>, index: number): unknown => items[index]
const getArrayLength = (items: ArrayLike<unknown>): number => items.length

export function SectionList<ItemT, SectionT = DefaultSectionT>(
  props: SectionListProps<ItemT, SectionT>,
): ReactElement {
  const { ref, stickySectionHeadersEnabled, ...rest } = props
  const inner = useRef<VirtualizedSectionListInstance>(null)

  useImperativeHandle(
    ref,
    (): SectionListInstance => ({
      scrollToLocation: (params) => inner.current?.scrollToLocation(params),
      recordInteraction: () => inner.current?.getListRef()?.recordInteraction(),
      flashScrollIndicators: () => inner.current?.getListRef()?.flashScrollIndicators(),
      getScrollResponder: () => inner.current?.getListRef()?.getScrollResponder() ?? null,
      getScrollableNode: () => inner.current?.getListRef()?.getScrollableNode() ?? null,
      setNativeProps: (nativeProps) => inner.current?.getListRef()?.setNativeProps(nativeProps),
    }),
    [],
  )

  return (
    <VirtualizedSectionList<ItemT, SectionT>
      {...(rest as Omit<VirtualizedSectionListProps<ItemT, SectionT>, 'ref'>)}
      // React Native's default is `Platform.OS === 'ios'`, so the headers don't stick on the web.
      stickySectionHeadersEnabled={stickySectionHeadersEnabled ?? false}
      ref={inner}
      getItemCount={getArrayLength}
      getItem={getArrayItem as (items: ArrayLike<ItemT>, index: number) => ItemT}
    />
  )
}
