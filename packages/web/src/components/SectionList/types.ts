import type { ReactNode, Ref } from 'react'

import type { ScrollViewInstance } from '../ScrollView/types'
import type { ListRenderItemInfo } from '../VirtualizedList/types'
import type {
  DefaultSectionT,
  ScrollToLocationParamsType,
  SectionData,
  VirtualizedSectionListProps,
} from '../VirtualizedSectionList/types'

export type SectionListData<ItemT, SectionT = DefaultSectionT> = SectionData<ItemT, SectionT>

export type SectionListRenderItemInfo<
  ItemT,
  SectionT = DefaultSectionT,
> = ListRenderItemInfo<ItemT> & {
  section: SectionListData<ItemT, SectionT>
}

export type SectionListRenderItem<ItemT, SectionT = DefaultSectionT> = (
  info: SectionListRenderItemInfo<ItemT, SectionT>,
) => ReactNode

export type SectionListInstance = {
  scrollToLocation: (params: ScrollToLocationParamsType) => void
  recordInteraction: () => void
  flashScrollIndicators: () => void
  getScrollResponder: () => ScrollViewInstance | null
  getScrollableNode: () => HTMLElement | null
  setNativeProps: (props: Record<string, unknown>) => void
}

type ListOwnProps = 'getItem' | 'getItemCount' | 'renderItem' | 'keyExtractor' | 'ref'

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface SectionListProps<ItemT, SectionT = DefaultSectionT> extends Omit<
  VirtualizedSectionListProps<ItemT, SectionT>,
  ListOwnProps
> {
  ref?: Ref<SectionListInstance> | undefined
  // The renderer of each item. A section's own renderItem wins.
  renderItem?: SectionListRenderItem<ItemT, SectionT> | undefined
  keyExtractor?: ((item: ItemT, index: number) => string) | undefined
}
