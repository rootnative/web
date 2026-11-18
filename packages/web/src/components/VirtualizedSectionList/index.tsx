/**
 * @license MIT
 * A port of `Lists/VirtualizedSectionList.js` of `@react-native/virtualized-lists` 0.88.1,
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 */

import {
  isValidElement,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react'

import { invariant } from '../../utils/invariant'
import { cellMetricsApprox, VirtualizedList } from '../VirtualizedList'
import type {
  ListRenderItemInfo,
  ListSeparators,
  ViewableItemsChangedInfo,
  ViewToken,
  VirtualizedListInstance,
  VirtualizedListProps,
} from '../VirtualizedList/types'
import { keyExtractor as defaultKeyExtractor } from '../VirtualizedList/VirtualizeUtils'
import type {
  DefaultSectionT,
  ScrollToLocationParamsType,
  SectionBase,
  VirtualizedSectionListInstance,
  VirtualizedSectionListProps,
} from './types'

export type {
  DefaultSectionT,
  ScrollToLocationParamsType,
  SectionBase,
  SectionData,
  VirtualizedSectionListInstance,
  VirtualizedSectionListProps,
} from './types'

type Section<ItemT> = SectionBase<ItemT>

type SeparatorComponentType = ComponentType<never> | ReactElement | null | undefined

// What the list reads from the props for the sections.
type Accessors<ItemT> = {
  sections: ReadonlyArray<Section<ItemT>>
  getItem: (data: unknown, index: number) => ItemT
  getItemCount: (data: unknown) => number
  keyExtractor: ((item: ItemT, index: number) => string) | null | undefined
}

// One index of the flat list: a section header, an item, or a section footer.
type CellInfo<ItemT> = {
  section: Section<ItemT>
  // The key of the section, or the key of the section and of the item.
  key: string
  // The index in the section. A header or a footer has none.
  index: number | null
  header?: boolean
  leadingItem?: ItemT | undefined
  leadingSection?: Section<ItemT> | undefined
  trailingItem?: ItemT | undefined
  trailingSection?: Section<ItemT> | undefined
}

type SeparatorProps<ItemT> = {
  leadingItem: ItemT | undefined
  leadingSection: Section<ItemT> | undefined
  section: Section<ItemT>
  trailingItem: ItemT | undefined
  trailingSection: Section<ItemT> | undefined
}

type SectionRenderItem<ItemT> = (info: {
  item: ItemT
  index: number
  section: Section<ItemT>
  separators: ListSeparators
}) => ReactNode

const resolveAccessors = <ItemT, SectionT>(
  props: VirtualizedSectionListProps<ItemT, SectionT>,
): Accessors<ItemT> => {
  const { getItem, getItemCount } = props
  invariant(
    getItemCount != null,
    'VirtualizedSectionList: The "getItemCount" prop must be provided',
  )
  invariant(getItem != null, 'VirtualizedSectionList: The "getItem" prop must be provided')
  return {
    sections: props.sections as ReadonlyArray<Section<ItemT>>,
    getItem,
    getItemCount,
    keyExtractor: props.keyExtractor,
  }
}

const cellInfo = <ItemT,>(
  accessors: Accessors<ItemT>,
  index: number,
): CellInfo<ItemT> | undefined => {
  const { sections, getItem, getItemCount, keyExtractor } = accessors
  let itemIndex = index
  for (const [sectionIndex, section] of sections.entries()) {
    const count = getItemCount(section.data)
    const key = section.key || String(sectionIndex)
    // Each section adds one cell before its items, for the header, and one after, for the footer.
    itemIndex -= 1
    if (itemIndex >= count + 1) {
      itemIndex -= count + 1
    } else if (itemIndex === -1) {
      return {
        section,
        key: `${key}:header`,
        index: null,
        header: true,
        trailingSection: sections[sectionIndex + 1],
      }
    } else if (itemIndex === count) {
      return {
        section,
        key: `${key}:footer`,
        index: null,
        header: false,
        trailingSection: sections[sectionIndex + 1],
      }
    } else {
      const extractor = section.keyExtractor || keyExtractor || defaultKeyExtractor
      return {
        section,
        key: `${key}:${extractor(getItem(section.data, itemIndex), itemIndex)}`,
        index: itemIndex,
        leadingItem: getItem(section.data, itemIndex - 1),
        leadingSection: sections[sectionIndex - 1],
        trailingItem: getItem(section.data, itemIndex + 1),
        trailingSection: sections[sectionIndex + 1],
      }
    }
  }
  return undefined
}

// The item of the flat list at an index: the section for its header and its footer.
const itemAt = <ItemT,>(
  accessors: Accessors<ItemT>,
  sections: ReadonlyArray<Section<ItemT>> | null | undefined,
  index: number,
): ItemT | Section<ItemT> | null => {
  if (!sections) return null
  let itemIndex = index - 1
  for (const section of sections) {
    const count = accessors.getItemCount(section.data)
    if (itemIndex === -1 || itemIndex === count) return section
    if (itemIndex < count) return accessors.getItem(section.data, itemIndex)
    itemIndex -= count + 2
  }
  return null
}

const separatorComponentFor = <ItemT,>(
  accessors: Accessors<ItemT>,
  props: { ItemSeparatorComponent?: unknown; SectionSeparatorComponent?: unknown },
  index: number,
  info: CellInfo<ItemT>,
  listItemCount: number,
): SeparatorComponentType => {
  const ItemSeparatorComponent = (info.section.ItemSeparatorComponent ||
    props.ItemSeparatorComponent) as SeparatorComponentType
  const SectionSeparatorComponent = props.SectionSeparatorComponent as SeparatorComponentType
  const isLastItemInList = index === listItemCount - 1
  const isLastItemInSection = info.index === accessors.getItemCount(info.section.data) - 1
  if (SectionSeparatorComponent && isLastItemInSection) return SectionSeparatorComponent
  if (ItemSeparatorComponent && !isLastItemInSection && !isLastItemInList) {
    return ItemSeparatorComponent
  }
  return null
}

// The separator callbacks of the mounted items and the list ref, which React Native keeps on the
// class.
class SectionListController<ItemT> {
  readonly instance: VirtualizedSectionListInstance
  private accessors: Accessors<ItemT> | undefined
  private stickySectionHeadersEnabled = false
  private listRef: VirtualizedListInstance<unknown> | null = null
  private readonly highlightCallbacks = new Map<string, (value: boolean) => void>()
  private readonly propsCallbacks = new Map<string, (value: SeparatorProps<ItemT>) => void>()

  constructor() {
    this.instance = {
      scrollToLocation: (params) => this.scrollToLocation(params),
      getListRef: () => this.listRef,
    }
  }

  commit(accessors: Accessors<ItemT>, stickySectionHeadersEnabled: boolean): void {
    this.accessors = accessors
    this.stickySectionHeadersEnabled = stickySectionHeadersEnabled
  }

  readonly setListRef = (instance: VirtualizedListInstance<unknown> | null): void => {
    this.listRef = instance
  }

  setUpdateHighlightFor(cellKey: string, callback: ((value: boolean) => void) | null): void {
    if (callback == null) this.highlightCallbacks.delete(cellKey)
    else this.highlightCallbacks.set(cellKey, callback)
  }

  setUpdatePropsFor(
    cellKey: string,
    callback: ((value: SeparatorProps<ItemT>) => void) | null,
  ): void {
    if (callback == null) this.propsCallbacks.delete(cellKey)
    else this.propsCallbacks.set(cellKey, callback)
  }

  updateHighlightFor(cellKey: string, value: boolean): void {
    this.highlightCallbacks.get(cellKey)?.(value)
  }

  updatePropsFor(cellKey: string, value: SeparatorProps<ItemT>): void {
    this.propsCallbacks.get(cellKey)?.(value)
  }

  private scrollToLocation(params: ScrollToLocationParamsType): void {
    const { accessors, listRef } = this
    if (accessors === undefined) return
    // The flat index of the cell at itemIndex 0 is the section header, as on native.
    let index = params.itemIndex
    for (let sectionIndex = 0; sectionIndex < params.sectionIndex; sectionIndex++) {
      const section = accessors.sections[sectionIndex]
      if (section !== undefined) index += accessors.getItemCount(section.data) + 2
    }
    let viewOffset = params.viewOffset || 0
    if (listRef == null) return
    // A sticky header covers the top of the viewport, so the item goes below it.
    if (params.itemIndex > 0 && this.stickySectionHeadersEnabled) {
      viewOffset += cellMetricsApprox(listRef, index - params.itemIndex)?.length ?? 0
    }
    listRef.scrollToIndex({
      animated: params.animated ?? undefined,
      index,
      viewOffset,
      viewPosition: params.viewPosition,
    })
  }
}

type SeparatorElementProps<ItemT> = SeparatorProps<ItemT> & { highlighted: boolean }

const renderSeparator = <ItemT,>(
  Component: SeparatorComponentType,
  highlighted: boolean,
  props: SeparatorProps<ItemT>,
): ReactNode => {
  if (Component == null) return null
  if (isValidElement(Component)) return Component
  const Separator = Component as ComponentType<SeparatorElementProps<ItemT>>
  return <Separator highlighted={highlighted} {...props} />
}

type ItemWithSeparatorProps<ItemT> = SeparatorProps<ItemT> & {
  LeadingSeparatorComponent: SeparatorComponentType
  // The trailing separator, which belongs to this item.
  SeparatorComponent: SeparatorComponentType
  cellKey: string
  index: number
  item: ItemT
  prevCellKey: string | undefined
  controller: SectionListController<ItemT>
  renderItem: SectionRenderItem<ItemT>
  inverted: boolean
}

function ItemWithSeparator<ItemT>(props: ItemWithSeparatorProps<ItemT>): ReactElement {
  const {
    LeadingSeparatorComponent,
    SeparatorComponent,
    cellKey,
    prevCellKey,
    controller,
    item,
    index,
    section,
    inverted,
  } = props

  const [leadingSeparatorHighlighted, setLeadingSeparatorHighlighted] = useState(false)
  const [separatorHighlighted, setSeparatorHighlighted] = useState(false)
  const [leadingSeparatorProps, setLeadingSeparatorProps] = useState<SeparatorProps<ItemT>>({
    leadingItem: props.leadingItem,
    leadingSection: props.leadingSection,
    section: props.section,
    trailingItem: props.item,
    trailingSection: props.trailingSection,
  })
  const [separatorProps, setSeparatorProps] = useState<SeparatorProps<ItemT>>({
    leadingItem: props.item,
    leadingSection: props.leadingSection,
    section: props.section,
    trailingItem: props.trailingItem,
    trailingSection: props.trailingSection,
  })

  useEffect(() => {
    controller.setUpdateHighlightFor(cellKey, setSeparatorHighlighted)
    controller.setUpdatePropsFor(cellKey, setSeparatorProps)
    return () => {
      controller.setUpdatePropsFor(cellKey, null)
      controller.setUpdateHighlightFor(cellKey, null)
    }
  }, [cellKey, controller])

  const separators: ListSeparators = {
    highlight: () => {
      setLeadingSeparatorHighlighted(true)
      setSeparatorHighlighted(true)
      if (prevCellKey != null) controller.updateHighlightFor(prevCellKey, true)
    },
    unhighlight: () => {
      setLeadingSeparatorHighlighted(false)
      setSeparatorHighlighted(false)
      if (prevCellKey != null) controller.updateHighlightFor(prevCellKey, false)
    },
    updateProps: (select, newProps) => {
      if (select === 'leading') {
        const next = { ...leadingSeparatorProps, ...newProps } as SeparatorProps<ItemT>
        if (LeadingSeparatorComponent != null) setLeadingSeparatorProps(next)
        else if (prevCellKey != null) controller.updatePropsFor(prevCellKey, next)
      } else if (SeparatorComponent != null) {
        setSeparatorProps({ ...separatorProps, ...newProps } as SeparatorProps<ItemT>)
      }
    },
  }
  const element = props.renderItem({ item, index, section, separators })
  const leadingSeparator = renderSeparator(
    LeadingSeparatorComponent,
    leadingSeparatorHighlighted,
    leadingSeparatorProps,
  )
  const separator = renderSeparator(SeparatorComponent, separatorHighlighted, separatorProps)
  return (
    <>
      {inverted ? separator : leadingSeparator}
      {element}
      {inverted ? leadingSeparator : separator}
    </>
  )
}

const isViewToken = <ItemT,>(token: ViewToken<ItemT> | null): token is ViewToken<ItemT> =>
  token != null

// The functions that the inner list calls in its render, from the props of the same render.
const createListFunctions = <ItemT, SectionT>(
  props: VirtualizedSectionListProps<ItemT, SectionT>,
  controller: SectionListController<ItemT>,
) => {
  const accessors = resolveAccessors(props)
  const listHeaderOffset = props.ListHeaderComponent ? 1 : 0
  const stickyHeaderIndices: number[] | undefined = props.stickySectionHeadersEnabled
    ? []
    : undefined
  let itemCount = 0
  for (const section of accessors.sections) {
    stickyHeaderIndices?.push(itemCount + listHeaderOffset)
    itemCount += 2 + accessors.getItemCount(section.data)
  }
  const listItemCount = itemCount

  const renderItem = ({ item, index }: ListRenderItemInfo<unknown>): ReactNode => {
    const info = cellInfo(accessors, index)
    if (info === undefined) return null
    const { section } = info
    if (info.index == null) {
      const render = info.header === true ? props.renderSectionHeader : props.renderSectionFooter
      return render ? render({ section: section as SectionT }) : null
    }
    const render = (section.renderItem || props.renderItem) as SectionRenderItem<ItemT> | undefined
    invariant(render, 'no renderItem!')
    const LeadingSeparatorComponent =
      info.index === 0 ? (props.SectionSeparatorComponent as SeparatorComponentType) : undefined
    return (
      <ItemWithSeparator<ItemT>
        SeparatorComponent={separatorComponentFor(accessors, props, index, info, listItemCount)}
        LeadingSeparatorComponent={LeadingSeparatorComponent}
        cellKey={info.key}
        index={info.index}
        item={item as ItemT}
        leadingItem={info.leadingItem}
        leadingSection={info.leadingSection}
        prevCellKey={cellInfo(accessors, index - 1)?.key}
        controller={controller}
        renderItem={render}
        section={section}
        trailingItem={info.trailingItem}
        trailingSection={info.trailingSection}
        inverted={!!props.inverted}
      />
    )
  }

  // A token of the flat list becomes a token of the section, with the index in the section.
  const convertViewable = (viewable: ViewToken<unknown>): ViewToken<ItemT> | null => {
    const flatIndex = viewable.index
    invariant(flatIndex != null, 'Received a broken ViewToken')
    const info = cellInfo(accessors, flatIndex)
    if (info === undefined) return null
    const item = viewable.item as ItemT
    const key =
      info.section.keyExtractor != null
        ? info.section.keyExtractor(item, info.index ?? undefined)
        : (accessors.keyExtractor ?? defaultKeyExtractor)(item, info.index ?? 0)
    return { ...viewable, item, index: info.index, key, section: info.section }
  }

  const { onViewableItemsChanged } = props
  return {
    accessors,
    stickyHeaderIndices,
    renderItem,
    getItemCount: (): number => listItemCount,
    getItem: (sections: ReadonlyArray<Section<ItemT>> | null | undefined, index: number) =>
      itemAt(accessors, sections, index),
    keyExtractor: (_item: unknown, index: number): string =>
      cellInfo(accessors, index)?.key || String(index),
    onViewableItemsChanged:
      onViewableItemsChanged == null
        ? undefined
        : ({ viewableItems, changed }: ViewableItemsChangedInfo<unknown>) =>
            onViewableItemsChanged({
              viewableItems: viewableItems.map(convertViewable).filter(isViewToken),
              changed: changed.map(convertViewable).filter(isViewToken),
            }),
  }
}

export function VirtualizedSectionList<ItemT, SectionT = DefaultSectionT>(
  props: VirtualizedSectionListProps<ItemT, SectionT>,
): ReactElement {
  const {
    ref,
    sections,
    stickySectionHeadersEnabled,
    // The cells render these.
    ItemSeparatorComponent: _itemSeparatorComponent,
    SectionSeparatorComponent: _sectionSeparatorComponent,
    renderItem: _renderItem,
    renderSectionHeader: _renderSectionHeader,
    renderSectionFooter: _renderSectionFooter,
    // The list gets its own versions of these.
    getItem: _getItem,
    getItemCount: _getItemCount,
    keyExtractor: _keyExtractor,
    onViewableItemsChanged: _onViewableItemsChanged,
    ...passThroughProps
  } = props

  const [controller] = useState(() => new SectionListController<ItemT>())
  const list = useMemo(() => createListFunctions(props, controller), [props, controller])

  useLayoutEffect(() => {
    controller.commit(list.accessors, stickySectionHeadersEnabled === true)
  })

  useImperativeHandle(ref, () => controller.instance, [controller])

  const { setListRef } = controller
  return (
    <VirtualizedList<unknown>
      {...(passThroughProps as Omit<VirtualizedListProps<unknown>, 'ref'>)}
      keyExtractor={list.keyExtractor}
      stickyHeaderIndices={list.stickyHeaderIndices}
      renderItem={list.renderItem}
      data={sections}
      getItem={list.getItem}
      getItemCount={list.getItemCount}
      onViewableItemsChanged={list.onViewableItemsChanged}
      ref={setListRef}
    />
  )
}
