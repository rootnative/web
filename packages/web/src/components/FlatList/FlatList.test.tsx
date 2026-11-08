import { act, createRef, type ReactElement } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { cleanup, render } from '../../test/render'
import { ScrollView } from '../ScrollView'
import type { ScrollViewProps } from '../ScrollView/types'
import { Text } from '../Text'
import { View } from '../View'
import { FlatList } from './index'
import type {
  CellRendererProps,
  FlatListInstance,
  ListRenderItemInfo,
  ListSeparators,
  ViewToken,
} from './types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

type Item = { id: string; label: string }

const items = (count: number): Item[] =>
  Array.from({ length: count }, (_, i) => ({ id: `i${i}`, label: `Item ${i}` }))

const scroller = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement
const content = (container: HTMLElement): HTMLElement =>
  scroller(container).firstElementChild as HTMLElement
const cellsOf = (container: HTMLElement): HTMLElement[] =>
  Array.from(content(container).children) as HTMLElement[]

const waitFor = async (check: () => void): Promise<void> => {
  await vi.waitFor(check, { timeout: 2000, interval: 10 })
}

const Row = ({ item }: ListRenderItemInfo<Item>): ReactElement => (
  <View style={{ height: 50 }}>
    <Text>{item.label}</Text>
  </View>
)

const renderRow = (info: ListRenderItemInfo<Item>): ReactElement => <Row {...info} />

const Separator = (): ReactElement => <View data-testid="sep" style={{ height: 2 }} />

const LeadingSeparator = (props: { highlighted: boolean; leadingItem: Item }): ReactElement => (
  <View
    data-testid="sep"
    data-highlighted={props.highlighted}
    data-leading={props.leadingItem.id}
  />
)

const viewableIndices = (fn: ReturnType<typeof vi.fn>): number[] | undefined =>
  (fn.mock.calls[0]?.[0] as { viewableItems: ViewToken[] } | undefined)?.viewableItems.map(
    (t) => t.index as number,
  )

describe('FlatList', () => {
  test('renders every item in a cell inside the ScrollView content', () => {
    const { container } = render(
      <FlatList data={items(5)} renderItem={renderRow} style={{ height: 120 }} />,
    )
    expect(getComputedStyle(scroller(container)).overflowY).toBe('auto')
    const cells = cellsOf(container)
    expect(cells).toHaveLength(5)
    expect(cells[0]?.textContent).toBe('Item 0')
    expect(cells[4]?.textContent).toBe('Item 4')
    expect(scroller(container).scrollHeight).toBe(250)
  })

  test('renders nothing for data that is not array-like, and no renderItem throws', () => {
    const { container } = render(
      <FlatList data={undefined} renderItem={renderRow} style={{ height: 120 }} />,
    )
    expect(cellsOf(container)).toHaveLength(0)

    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<FlatList data={items(1)} />)).toThrow(/renderItem/)
  })

  test('ListItemComponent renders the item when there is no renderItem', () => {
    const { container } = render(<FlatList data={items(2)} ListItemComponent={Row} />)
    expect(cellsOf(container)[1]?.textContent).toBe('Item 1')
  })

  test('separators sit after every item but the last', () => {
    const { container } = render(
      <FlatList data={items(3)} renderItem={renderRow} ItemSeparatorComponent={Separator} />,
    )
    const cells = cellsOf(container)
    expect(cells[0]?.querySelectorAll('[data-testid="sep"]')).toHaveLength(1)
    expect(cells[1]?.querySelectorAll('[data-testid="sep"]')).toHaveLength(1)
    expect(cells[2]?.querySelectorAll('[data-testid="sep"]')).toHaveLength(0)
    expect(scroller(container).scrollHeight).toBe(154)
  })

  test('separators.highlight reaches this cell and the one before it', () => {
    const separatorsOf: ListSeparators[] = []
    const { container } = render(
      <FlatList
        data={items(3)}
        ItemSeparatorComponent={LeadingSeparator}
        renderItem={(info) => {
          separatorsOf[info.index] = info.separators
          return <Row {...info} />
        }}
      />,
    )
    const seps = (): HTMLElement[] =>
      Array.from(content(container).querySelectorAll('[data-testid="sep"]'))
    expect(seps().map((s) => s.dataset['leading'])).toEqual(['i0', 'i1'])
    expect(seps().map((s) => s.dataset['highlighted'])).toEqual(['false', 'false'])

    // Item 1: its own separator (after it) and the one before it.
    act(() => separatorsOf[1]?.highlight())
    expect(seps().map((s) => s.dataset['highlighted'])).toEqual(['true', 'true'])
    act(() => separatorsOf[1]?.unhighlight())
    expect(seps().map((s) => s.dataset['highlighted'])).toEqual(['false', 'false'])

    act(() => separatorsOf[2]?.updateProps('leading', { highlighted: true }))
    expect(seps().map((s) => s.dataset['highlighted'])).toEqual(['false', 'true'])
  })

  test('header, footer and their styles', () => {
    const { container } = render(
      <FlatList
        data={items(2)}
        renderItem={renderRow}
        ListHeaderComponent={<Text>Header</Text>}
        ListHeaderComponentStyle={{ padding: 3 }}
        ListFooterComponent={() => <Text>Footer</Text>}
        ListFooterComponentStyle={{ padding: 5 }}
      />,
    )
    const cells = cellsOf(container)
    expect(cells).toHaveLength(4)
    expect(cells[0]?.textContent).toBe('Header')
    expect(getComputedStyle(cells[0] as HTMLElement).paddingTop).toBe('3px')
    expect(cells[3]?.textContent).toBe('Footer')
    expect(getComputedStyle(cells[3] as HTMLElement).paddingTop).toBe('5px')
  })

  test('ListEmptyComponent renders between the header and the footer for no data', () => {
    const { container } = render(
      <FlatList
        data={[]}
        renderItem={renderRow}
        ListHeaderComponent={<Text>Header</Text>}
        ListEmptyComponent={<Text>Empty</Text>}
        ListFooterComponent={<Text>Footer</Text>}
      />,
    )
    expect(cellsOf(container).map((c) => c.textContent)).toEqual(['Header', 'Empty', 'Footer'])
  })

  test('stickyHeaderIndices count the header as child 0', () => {
    const { container } = render(
      <FlatList
        data={items(3)}
        renderItem={renderRow}
        ListHeaderComponent={<Text>Header</Text>}
        stickyHeaderIndices={[0]}
        style={{ height: 100 }}
      />,
    )
    const first = cellsOf(container)[0] as HTMLElement
    expect(getComputedStyle(first).position).toBe('sticky')
    expect(first.textContent).toBe('Header')
  })

  test('keyExtractor defaults to key, then id, then the index', () => {
    const onViewableItemsChanged = vi.fn()
    render(
      <FlatList
        data={[{ key: 'k' }, { id: 7 }, 'plain']}
        renderItem={() => <View style={{ height: 10 }} />}
        onViewableItemsChanged={onViewableItemsChanged}
        style={{ height: 100 }}
      />,
    )
    return waitFor(() => {
      expect(onViewableItemsChanged).toHaveBeenCalled()
      const info = onViewableItemsChanged.mock.calls[0]?.[0] as { viewableItems: ViewToken[] }
      expect(info.viewableItems.map((t) => t.key)).toEqual(['k', '7', '2'])
    })
  })

  test('horizontal lays the cells out in a row', () => {
    const { container } = render(
      <FlatList
        horizontal
        data={items(4)}
        renderItem={({ item }) => <View style={{ width: 60, height: 20 }}>{item.label}</View>}
        style={{ width: 100 }}
      />,
    )
    expect(getComputedStyle(content(container)).flexDirection).toBe('row')
    expect(getComputedStyle(cellsOf(container)[0] as HTMLElement).flexDirection).toBe('row')
    expect(scroller(container).scrollWidth).toBe(240)
  })

  test('numColumns groups the items into rows with columnWrapperStyle', () => {
    const indices: number[] = []
    const { container } = render(
      <FlatList
        data={items(5)}
        numColumns={2}
        columnWrapperStyle={{ gap: 4 }}
        renderItem={(info) => {
          indices.push(info.index)
          return <View style={{ width: 40, height: 40 }} />
        }}
      />,
    )
    const cells = cellsOf(container)
    expect(cells).toHaveLength(3)
    const row = cells[0]?.firstElementChild as HTMLElement
    expect(getComputedStyle(row).flexDirection).toBe('row')
    expect(getComputedStyle(row).gap).toBe('4px')
    expect(row.children).toHaveLength(2)
    expect(cells[2]?.firstElementChild?.children).toHaveLength(1)
    expect(indices).toEqual([0, 1, 2, 3, 4])
  })

  test('numColumns with horizontal throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(<FlatList horizontal numColumns={2} data={items(2)} renderItem={renderRow} />),
    ).toThrow(/numColumns does not support horizontal/)
  })

  test('inverted flips the scroller and each cell', () => {
    const { container } = render(
      <FlatList inverted data={items(2)} renderItem={renderRow} style={{ height: 60 }} />,
    )
    expect(getComputedStyle(scroller(container)).transform).toBe('matrix(1, 0, 0, -1, 0, 0)')
    const cell = cellsOf(container)[0] as HTMLElement
    expect(getComputedStyle(cell).transform).toBe('matrix(1, 0, 0, -1, 0, 0)')
    expect(getComputedStyle(cell).flexDirection).toBe('column-reverse')
  })

  test('CellRendererComponent wraps the item inside the measuring cell', () => {
    const seen: Array<Pick<CellRendererProps<Item>, 'cellKey' | 'index'>> = []
    const Cell = (props: CellRendererProps<Item>): ReactElement => {
      seen.push({ cellKey: props.cellKey, index: props.index })
      return (
        <View data-testid="custom" style={props.style}>
          {props.children}
        </View>
      )
    }
    const { container } = render(
      <FlatList data={items(2)} renderItem={renderRow} CellRendererComponent={Cell} />,
    )
    expect(seen).toEqual([
      { cellKey: 'i0', index: 0 },
      { cellKey: 'i1', index: 1 },
    ])
    const cell = cellsOf(container)[1] as HTMLElement
    expect(cell.firstElementChild?.getAttribute('data-testid')).toBe('custom')
    expect(cell.offsetTop).toBe(50)
  })

  test('onEndReached fires once per content length, and again after the content grows', async () => {
    const onEndReached = vi.fn()
    const { container, rerender } = render(
      <FlatList
        data={items(10)}
        renderItem={renderRow}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        style={{ height: 100 }}
      />,
    )
    const element = scroller(container)
    // 500 - 100 - 330 = 70 > 50: outside the threshold.
    element.scrollTop = 330
    await waitFor(() => expect(element.scrollTop).toBe(330))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(onEndReached).not.toHaveBeenCalled()

    element.scrollTop = 360
    await waitFor(() => expect(onEndReached).toHaveBeenCalledTimes(1))
    expect(onEndReached.mock.calls[0]?.[0]).toEqual({ distanceFromEnd: 40 })

    element.scrollTop = 400
    await waitFor(() => expect(element.scrollTop).toBe(400))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(onEndReached).toHaveBeenCalledTimes(1)

    rerender(
      <FlatList
        data={items(20)}
        renderItem={renderRow}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        style={{ height: 100 }}
      />,
    )
    element.scrollTop = 900
    await waitFor(() => expect(onEndReached).toHaveBeenCalledTimes(2))
  })

  test('a list shorter than its viewport calls onEndReached after mount', async () => {
    const onEndReached = vi.fn()
    render(
      <FlatList
        data={items(1)}
        renderItem={renderRow}
        onEndReached={onEndReached}
        style={{ height: 200 }}
      />,
    )
    await waitFor(() => expect(onEndReached).toHaveBeenCalledTimes(1))
  })

  test('onStartReached fires when the scroll comes back to the start', async () => {
    const onStartReached = vi.fn()
    const { container } = render(
      <FlatList
        data={items(10)}
        renderItem={renderRow}
        initialScrollIndex={4}
        onStartReached={onStartReached}
        onStartReachedThreshold={0.2}
        style={{ height: 100 }}
      />,
    )
    const element = scroller(container)
    expect(element.scrollTop).toBe(200)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(onStartReached).not.toHaveBeenCalled()

    element.scrollTop = 10
    await waitFor(() => expect(onStartReached).toHaveBeenCalledTimes(1))
    expect(onStartReached.mock.calls[0]?.[0]).toEqual({ distanceFromStart: 10 })
  })

  test('onViewableItemsChanged reports the visible items and the change on scroll', async () => {
    const onViewableItemsChanged = vi.fn()
    const { container } = render(
      <FlatList
        data={items(10)}
        renderItem={renderRow}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        style={{ height: 120 }}
      />,
    )
    await waitFor(() => expect(onViewableItemsChanged).toHaveBeenCalledTimes(1))
    const first = onViewableItemsChanged.mock.calls[0]?.[0] as { viewableItems: ViewToken<Item>[] }
    // Items 0 and 1 are whole; item 2 shows 20 of 50 px.
    expect(first.viewableItems.map((t) => t.index)).toEqual([0, 1])
    expect(first.viewableItems[0]).toEqual({
      item: { id: 'i0', label: 'Item 0' },
      key: 'i0',
      index: 0,
      isViewable: true,
    })

    scroller(container).scrollTop = 60
    await waitFor(() => expect(onViewableItemsChanged).toHaveBeenCalledTimes(2))
    const second = onViewableItemsChanged.mock.calls[1]?.[0] as {
      viewableItems: ViewToken<Item>[]
      changed: ViewToken<Item>[]
    }
    // Item 1 shows 40 px, item 2 is whole, item 3 shows 30 px.
    expect(second.viewableItems.map((t) => t.index)).toEqual([1, 2, 3])
    expect(second.changed.map((t) => [t.index, t.isViewable])).toEqual([
      [2, true],
      [3, true],
      [0, false],
    ])
  })

  test('viewabilityConfigCallbackPairs run one tracker per config', async () => {
    const loose = vi.fn()
    const strict = vi.fn()
    render(
      <FlatList
        data={items(10)}
        renderItem={renderRow}
        viewabilityConfigCallbackPairs={[
          { viewabilityConfig: { itemVisiblePercentThreshold: 10 }, onViewableItemsChanged: loose },
          {
            viewabilityConfig: { itemVisiblePercentThreshold: 90 },
            onViewableItemsChanged: strict,
          },
        ]}
        style={{ height: 125 }}
      />,
    )
    await waitFor(() => {
      expect(loose).toHaveBeenCalledTimes(1)
      expect(strict).toHaveBeenCalledTimes(1)
    })
    expect(viewableIndices(loose)).toEqual([0, 1, 2])
    expect(viewableIndices(strict)).toEqual([0, 1])
  })

  test('numColumns expands a row into one view token per item', async () => {
    const onViewableItemsChanged = vi.fn()
    render(
      <FlatList
        data={items(5)}
        numColumns={2}
        renderItem={() => <View style={{ width: 40, height: 40 }} />}
        onViewableItemsChanged={onViewableItemsChanged}
        style={{ height: 50 }}
      />,
    )
    await waitFor(() => expect(onViewableItemsChanged).toHaveBeenCalledTimes(1))
    const info = onViewableItemsChanged.mock.calls[0]?.[0] as { viewableItems: ViewToken<Item>[] }
    expect(info.viewableItems.map((t) => [t.index, t.key])).toEqual([
      [0, 'i0'],
      [1, 'i1'],
      [2, 'i2'],
      [3, 'i3'],
    ])
  })

  test('the instance scrolls by offset, index, item and to the end', async () => {
    const ref = createRef<FlatListInstance<Item>>()
    const data = items(20)
    const { container } = render(
      <FlatList ref={ref} data={data} renderItem={renderRow} style={{ height: 100 }} />,
    )
    const element = scroller(container)

    ref.current?.scrollToOffset({ offset: 75, animated: false })
    expect(element.scrollTop).toBe(75)

    ref.current?.scrollToIndex({ index: 6, animated: false })
    expect(element.scrollTop).toBe(300)

    // viewPosition 1 puts the item at the bottom edge; viewOffset lifts it 10 px.
    ref.current?.scrollToIndex({ index: 6, viewPosition: 1, viewOffset: 10, animated: false })
    expect(element.scrollTop).toBe(240)

    ref.current?.scrollToItem({ item: data[10] as Item, animated: false })
    expect(element.scrollTop).toBe(500)

    ref.current?.scrollToEnd({ animated: false })
    await waitFor(() => expect(element.scrollTop).toBe(900))

    expect(ref.current?.getScrollableNode()).toBe(element)
    expect(ref.current?.getNativeScrollRef()).toBe(element)
    expect(() => ref.current?.scrollToIndex({ index: 20 })).toThrow(/out of range/)
  })

  test('scrollToItem with numColumns scrolls to the row of the item', () => {
    const ref = createRef<FlatListInstance<Item>>()
    const data = items(10)
    const { container } = render(
      <FlatList
        ref={ref}
        data={data}
        numColumns={2}
        renderItem={() => <View style={{ width: 40, height: 40 }} />}
        style={{ height: 50 }}
      />,
    )
    ref.current?.scrollToItem({ item: data[5] as Item, animated: false })
    expect(scroller(container).scrollTop).toBe(80)
  })

  test('initialScrollIndex sets the first position without animation', () => {
    const { container } = render(
      <FlatList
        data={items(10)}
        renderItem={renderRow}
        ListHeaderComponent={<View style={{ height: 30 }} />}
        initialScrollIndex={3}
        style={{ height: 100 }}
      />,
    )
    expect(scroller(container).scrollTop).toBe(180)
  })

  test('recordInteraction releases a waitForInteraction tracker', async () => {
    const ref = createRef<FlatListInstance<Item>>()
    const onViewableItemsChanged = vi.fn()
    render(
      <FlatList
        ref={ref}
        data={items(10)}
        renderItem={renderRow}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 0, waitForInteraction: true }}
        style={{ height: 100 }}
      />,
    )
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(onViewableItemsChanged).not.toHaveBeenCalled()
    ref.current?.recordInteraction()
    expect(onViewableItemsChanged).toHaveBeenCalledTimes(1)
  })

  test('the ScrollView props and callbacks pass through', async () => {
    const onScroll = vi.fn()
    const onContentSizeChange = vi.fn()
    const { container } = render(
      <FlatList
        data={items(10)}
        renderItem={renderRow}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        contentContainerStyle={{ padding: 4 }}
        showsVerticalScrollIndicator={false}
        testID="list"
        style={{ height: 100 }}
      />,
    )
    const element = scroller(container)
    expect(element.dataset['testid']).toBe('list')
    expect(getComputedStyle(element).scrollbarWidth).toBe('none')
    expect(getComputedStyle(content(container)).paddingTop).toBe('4px')
    await waitFor(() => expect(onContentSizeChange).toHaveBeenCalled())

    element.scrollTop = 20
    await waitFor(() => expect(onScroll).toHaveBeenCalled())
    expect(onScroll.mock.calls[0]?.[0].nativeEvent.contentOffset.y).toBe(20)
  })

  test('renderScrollComponent renders the scroller and gets the ref', () => {
    const ref = createRef<FlatListInstance<Item>>()
    const seen: ScrollViewProps[] = []
    const { container } = render(
      <FlatList
        ref={ref}
        data={items(3)}
        renderItem={renderRow}
        renderScrollComponent={(props) => {
          seen.push(props)
          return <ScrollView {...props} testID="custom-scroller" />
        }}
        style={{ height: 100 }}
      />,
    )
    expect(seen).toHaveLength(1)
    expect(seen[0]?.horizontal).toBe(false)
    const element = scroller(container)
    expect(element.dataset['testid']).toBe('custom-scroller')
    expect(cellsOf(container)).toHaveLength(3)
    expect(ref.current?.getScrollableNode()).toBe(element)
  })
})
