import type { ComponentType, ReactElement, ReactNode, Ref } from 'react'

import type {
  ListSeparators,
  VirtualizedListInstance,
  VirtualizedListProps,
} from '../VirtualizedList/types'

// React Native types an untyped section, and a separator's props, as `any`, so a section can carry
// any field.
// oxlint-disable-next-line typescript/no-explicit-any
type Any = any

export type DefaultSectionT = { [key: string]: Any }

export type SectionBase<SectionItemT, SectionT = DefaultSectionT> = {
  data: ReadonlyArray<SectionItemT>
  // Keeps track of a section that moves. Without it, the section index is the key.
  key?: string | undefined
  // These override the props of the list, for this section only.
  renderItem?:
    | ((info: {
        item: SectionItemT
        index: number
        section: SectionData<SectionItemT, SectionT>
        separators: ListSeparators
      }) => ReactElement | null)
    | undefined
  ItemSeparatorComponent?: ComponentType<Any> | ReactElement | undefined
  keyExtractor?: ((item: SectionItemT | undefined, index?: number) => string) | undefined
}

export type SectionData<SectionItemT, SectionT = DefaultSectionT> =
  | (Readonly<SectionBase<SectionItemT, SectionT>> & SectionT)
  | (SectionBase<SectionItemT, SectionT> & SectionT)
  | SectionT

export type ScrollToLocationParamsType = {
  animated?: boolean | null | undefined
  itemIndex: number
  sectionIndex: number
  viewOffset?: number | undefined
  viewPosition?: number | undefined
}

export type VirtualizedSectionListInstance = {
  scrollToLocation: (params: ScrollToLocationParamsType) => void
  getListRef: () => VirtualizedListInstance<unknown> | null
}

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface VirtualizedSectionListProps<ItemT, SectionT = DefaultSectionT> extends Omit<
  VirtualizedListProps<ItemT>,
  'data' | 'renderItem' | 'ref' | 'ItemSeparatorComponent'
> {
  ref?: Ref<VirtualizedSectionListInstance> | undefined
  // Gets `highlighted`, `leadingItem`, `trailingItem`, `section`, `leadingSection`, and
  // `trailingSection`.
  ItemSeparatorComponent?: ComponentType<Any> | ReactElement | null | undefined
  sections: ReadonlyArray<SectionData<ItemT, SectionT>>
  renderItem?:
    | ((info: {
        item: ItemT
        index: number
        section: SectionT
        separators: ListSeparators
      }) => ReactNode)
    | undefined
  renderSectionHeader?: ((info: { section: SectionT }) => ReactNode) | undefined
  renderSectionFooter?: ((info: { section: SectionT }) => ReactNode) | undefined
  // Above the first item and below the last item of each section, not between items.
  SectionSeparatorComponent?: ComponentType<Any> | undefined
  stickySectionHeadersEnabled?: boolean | undefined
}
