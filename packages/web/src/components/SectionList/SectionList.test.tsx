import { createRef, type ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { mount, renderOutsideAct } from '../../test/mount'
import { Text } from '../Text'
import { View } from '../View'
import type { CellRendererProps, ListSeparators, ViewToken } from '../VirtualizedList/types'
import { VirtualizedSectionList } from '../VirtualizedSectionList'
import { SectionList } from './index'
import type { SectionListInstance, SectionListRenderItemInfo } from './types'

renderOutsideAct()

afterEach(() => {
  vi.restoreAllMocks()
})

type Item = { id: string; label: string }
type Section = { title: string; data: Item[]; key?: string | undefined }

const section = (title: string, count: number, key?: string): Section => ({
  title,
  key,
  data: Array.from({ length: count }, (_, i) => ({ id: `${title}${i}`, label: `${title}${i}` })),
})

const Row = ({ item }: { item: Item }): ReactElement => (
  <View style={{ height: 50 }}>
    <Text>{item.label}</Text>
  </View>
)
const renderRow = ({ item }: SectionListRenderItemInfo<Item, Section>): ReactElement => (
  <Row item={item} />
)
const renderHeader = ({ section: { title } }: { section: Section }): ReactElement => (
  <View style={{ height: 20 }}>
    <Text>{`[${title}]`}</Text>
  </View>
)
const renderFooter = ({ section: { title } }: { section: Section }): ReactElement => (
  <Text>{`/${title}`}</Text>
)

const SectionSeparator = (): ReactElement => <View data-testid="section-sep" />

const HighlightSeparator = (props: { highlighted: boolean }): ReactElement => (
  <View data-testid="sep" data-highlighted={props.highlighted} />
)

const scroller = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement
const content = (container: HTMLElement): HTMLElement =>
  scroller(container).firstElementChild as HTMLElement
const firstChild = (container: HTMLElement): HTMLElement =>
  content(container).firstElementChild as HTMLElement

const waitFor = async (check: () => void): Promise<void> => {
  await vi.waitFor(check, { timeout: 2000, interval: 10 })
}

describe('SectionList', () => {
  test('renders each section: its header, its items, and its footer', () => {
    const { container } = mount(
      <SectionList
        sections={[section('A', 2), section('B', 1)]}
        renderItem={renderRow}
        renderSectionHeader={renderHeader}
        renderSectionFooter={renderFooter}
      />,
    )
    expect(content(container).textContent).toBe('[A]A0A1/A[B]B0/B')
  })

  test('the renderItem of a section wins over the renderItem of the list', () => {
    const special = {
      ...section('B', 1),
      renderItem: ({ item }: { item: Item }) => <Text>{`*${item.label}`}</Text>,
    }
    const { container } = mount(
      <SectionList sections={[section('A', 2), special]} renderItem={renderRow} />,
    )
    expect(content(container).textContent).toBe('A0A1*B0')
  })

  test('a cell key joins the key of the section and the key of the item', () => {
    const keys: string[] = []
    const Cell = (props: CellRendererProps<unknown>): ReactElement => {
      keys.push(props.cellKey)
      return <View style={props.style}>{props.children}</View>
    }
    mount(
      <SectionList
        sections={[section('A', 1, 'first'), section('B', 1)]}
        renderItem={renderRow}
        CellRendererComponent={Cell}
      />,
    )
    expect(keys).toEqual([
      'first:header',
      'first:A0',
      'first:footer',
      '1:header',
      '1:B0',
      '1:footer',
    ])
  })

  test('ItemSeparatorComponent sits between the items of a section, and SectionSeparatorComponent around them', () => {
    const seen: Array<{
      leading: string | undefined
      trailing: string | undefined
      section: string
    }> = []
    const ItemSeparator = (props: {
      leadingItem?: Item
      trailingItem?: Item
      section: Section
    }): ReactElement => {
      seen.push({
        leading: props.leadingItem?.id,
        trailing: props.trailingItem?.id,
        section: props.section.title,
      })
      return <View data-testid="item-sep" />
    }
    const { container } = mount(
      <SectionList
        sections={[section('A', 2), section('B', 1)]}
        renderItem={renderRow}
        ItemSeparatorComponent={ItemSeparator}
        SectionSeparatorComponent={SectionSeparator}
      />,
    )
    const order = Array.from(content(container).querySelectorAll('[data-testid]'), (element) =>
      element.getAttribute('data-testid'),
    )
    expect(order).toEqual(['section-sep', 'item-sep', 'section-sep', 'section-sep', 'section-sep'])
    expect(seen[0]).toEqual({ leading: 'A0', trailing: 'A1', section: 'A' })
  })

  test('separators.highlight reaches the separator of this item and of the item before it', () => {
    const separatorsOf: ListSeparators[] = []
    const { container } = mount(
      <SectionList<Item, Section>
        sections={[section('A', 3)]}
        ItemSeparatorComponent={HighlightSeparator}
        renderItem={(info) => {
          separatorsOf[info.index] = info.separators
          return <Row item={info.item} />
        }}
      />,
    )
    const highlighted = (): Array<string | undefined> =>
      Array.from(
        content(container).querySelectorAll<HTMLElement>('[data-testid="sep"]'),
        (element) => element.dataset['highlighted'],
      )
    expect(highlighted()).toEqual(['false', 'false'])
    flushSync(() => separatorsOf[1]?.highlight())
    expect(highlighted()).toEqual(['true', 'true'])
    flushSync(() => separatorsOf[1]?.unhighlight())
    expect(highlighted()).toEqual(['false', 'false'])
  })

  test('the section headers stick with stickySectionHeadersEnabled, which is off by default', () => {
    const sections = [section('A', 2), section('B', 2)]
    const plain = mount(
      <SectionList sections={sections} renderItem={renderRow} renderSectionHeader={renderHeader} />,
    )
    const sticky = mount(
      <SectionList
        sections={sections}
        renderItem={renderRow}
        renderSectionHeader={renderHeader}
        stickySectionHeadersEnabled
      />,
    )
    expect(getComputedStyle(firstChild(plain.container)).position).not.toBe('sticky')
    expect(getComputedStyle(firstChild(sticky.container)).position).toBe('sticky')
  })

  test('scrollToLocation scrolls to the item, and below a sticky header', async () => {
    const sections = [section('A', 2), section('B', 2)]
    const plainRef = createRef<SectionListInstance>()
    const stickyRef = createRef<SectionListInstance>()
    const plain = mount(
      <SectionList
        ref={plainRef}
        sections={sections}
        renderItem={renderRow}
        renderSectionHeader={renderHeader}
        style={{ height: 100 }}
      />,
    )
    const sticky = mount(
      <SectionList
        ref={stickyRef}
        sections={sections}
        renderItem={renderRow}
        renderSectionHeader={renderHeader}
        stickySectionHeadersEnabled
        style={{ height: 100 }}
      />,
    )
    // Header A 0-20, A0 20-70, A1 70-120, an empty footer, header B 120-140, B0 140-190.
    // itemIndex 0 is the section header, as on native.
    await waitFor(() => {
      plainRef.current?.scrollToLocation({ sectionIndex: 1, itemIndex: 1, animated: false })
      expect(scroller(plain.container).scrollTop).toBe(140)
    })
    plainRef.current?.scrollToLocation({ sectionIndex: 1, itemIndex: 0, animated: false })
    expect(scroller(plain.container).scrollTop).toBe(120)
    // The 20 px sticky header covers the top, so B0 goes below it.
    await waitFor(() => {
      stickyRef.current?.scrollToLocation({ sectionIndex: 1, itemIndex: 1, animated: false })
      expect(scroller(sticky.container).scrollTop).toBe(120)
    })
  })

  test('onViewableItemsChanged gives the index in the section and the section', async () => {
    const onViewableItemsChanged = vi.fn()
    mount(
      <SectionList
        sections={[section('A', 2), section('B', 1)]}
        renderItem={renderRow}
        onViewableItemsChanged={onViewableItemsChanged}
        style={{ height: 300 }}
      />,
    )
    await waitFor(() => expect(onViewableItemsChanged).toHaveBeenCalled())
    const info = onViewableItemsChanged.mock.calls.at(-1)?.[0] as {
      viewableItems: Array<ViewToken<Item>>
    }
    const items = info.viewableItems
      .filter((token) => token.index != null)
      .map((token) => [token.index, token.key, (token.section as Section).title])
    expect(items).toEqual([
      [0, 'A0', 'A'],
      [1, 'A1', 'A'],
      [0, 'B0', 'B'],
    ])
  })

  test('the ref methods reach the inner list', () => {
    const ref = createRef<SectionListInstance>()
    const { container } = mount(
      <SectionList ref={ref} sections={[section('A', 1)]} renderItem={renderRow} />,
    )
    expect(ref.current?.getScrollableNode()).toBe(scroller(container))
    expect(ref.current?.getScrollResponder()).toBe(scroller(container))
    expect(() => ref.current?.recordInteraction()).not.toThrow()
  })
})

describe('VirtualizedSectionList', () => {
  test('reads any collection through getItem and getItemCount', () => {
    type Collection = { size: number; at: (index: number) => Item }
    const collection: Collection = {
      size: 2,
      at: (index) => ({ id: `c${index}`, label: `C${index}` }),
    }
    const { container } = mount(
      <VirtualizedSectionList<Item>
        sections={[{ title: 'C', data: collection }]}
        getItem={(data: Collection, index) => data.at(index)}
        getItemCount={(data: Collection) => data.size}
        renderItem={({ item }) => <Text>{item.label}</Text>}
      />,
    )
    expect(content(container).textContent).toBe('C0C1')
  })
})
