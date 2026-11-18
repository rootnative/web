import { createRef, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server.browser'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { createStyleRegistry, StyleRegistryProvider } from '../../server'
import { mount, renderOutsideAct } from '../../test/mount'
import { render } from '../../test/render'
import { resetWarnings } from '../../utils/warn'
import { Text } from '../Text'
import { View } from '../View'
import { VirtualizedList } from './index'
import type {
  ListRenderItemInfo,
  ViewableItemsChangedInfo,
  VirtualizedListInstance,
  VirtualizedListProps,
} from './types'

renderOutsideAct()

afterEach(() => {
  resetWarnings()
  vi.restoreAllMocks()
})

type Item = { key: string; label: string }

const ROW = 50

const items = (count: number): Item[] =>
  Array.from({ length: count }, (_, index) => ({ key: `k${index}`, label: `Item ${index}` }))

const range = (first: number, last: number): number[] =>
  Array.from({ length: last - first + 1 }, (_, index) => first + index)

const getItem = (data: Item[], index: number): Item => data[index] as Item
const getItemCount = (data: Item[]): number => data.length
const getItemLayout = (_data: unknown, index: number) => ({
  index,
  length: ROW,
  offset: index * ROW,
})

const Row = ({ item, index }: ListRenderItemInfo<Item>): ReactElement => (
  <View data-index={index} style={{ height: ROW }}>
    <Text>{item.label}</Text>
  </View>
)
const renderRow = (info: ListRenderItemInfo<Item>): ReactElement => <Row {...info} />

const Column = ({ item, index }: ListRenderItemInfo<Item>): ReactElement => (
  <View data-index={index} style={{ width: ROW }}>
    <Text>{item.label}</Text>
  </View>
)
const renderColumn = (info: ListRenderItemInfo<Item>): ReactElement => <Column {...info} />

const FocusRow = ({ item, index }: ListRenderItemInfo<Item>): ReactElement => (
  <View data-index={index} focusable style={{ height: ROW }}>
    <Text>{item.label}</Text>
  </View>
)
const renderFocusRow = (info: ListRenderItemInfo<Item>): ReactElement => <FocusRow {...info} />

// A list of `count` rows of 50 px in a 200 px viewport.
const list = (count: number, props: Partial<VirtualizedListProps<Item>> = {}): ReactElement => (
  <VirtualizedList<Item>
    data={items(count)}
    getItem={getItem}
    getItemCount={getItemCount}
    renderItem={renderRow}
    style={{ height: 200 }}
    {...props}
  />
)

const scroller = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement

const rendered = (container: HTMLElement): number[] =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-index]'), (element) =>
    Number(element.dataset.index),
  )

const cellOf = (container: HTMLElement, index: number): HTMLElement =>
  container.querySelector(`[data-index="${index}"]`) as HTMLElement

const waitFor = async (check: () => void): Promise<void> => {
  await vi.waitFor(check, { timeout: 2000, interval: 10 })
}

const nextFrames = async (): Promise<void> => {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

const viewableIndices = (handler: ReturnType<typeof vi.fn>): number[] | undefined => {
  const info = handler.mock.calls.at(-1)?.[0] as ViewableItemsChangedInfo<Item> | undefined
  return info?.viewableItems.map((token) => token.index as number)
}

describe('VirtualizedList', () => {
  test('renders initialNumToRender cells first, then fills the window in batches', async () => {
    const { container } = mount(list(100))
    expect(rendered(container)).toEqual(range(0, 9))
    // windowSize 21 holds 10 viewports on each side: 2000 px after the 200 px viewport.
    await waitFor(() => expect(rendered(container)).toEqual(range(0, 43)))
    // With no getItemLayout, the content ends at the last measured cell.
    expect(scroller(container).scrollHeight).toBe(2200)
  })

  test('with getItemLayout, a spacer holds the place of the cells that are not rendered', () => {
    const { container } = mount(list(100, { getItemLayout }))
    expect(rendered(container)).toEqual(range(0, 9))
    expect(scroller(container).scrollHeight).toBe(5000)
  })

  test('a far scroll renders the cells around the viewport and drops the others', async () => {
    const { container } = mount(list(1000, { getItemLayout, windowSize: 3 }))
    const element = scroller(container)
    element.scrollTop = 25000
    // 200 px of overscan on each side: cells 495 to 507.
    await waitFor(() =>
      expect(rendered(container).filter((index) => index > 9)).toEqual(range(495, 507)),
    )
    // The first batch stays, for a fast scroll back to the top.
    expect(rendered(container).filter((index) => index <= 9)).toEqual(range(0, 9))
    expect(element.scrollHeight).toBe(50000)
  })

  test('a scroll to the end of the measured cells renders more of them', async () => {
    const { container } = mount(list(100))
    await waitFor(() => expect(rendered(container)).toHaveLength(44))
    const element = scroller(container)
    element.scrollTop = 2000
    // 2000 px of overscan after the viewport at 2000 px: cells up to 83.
    await waitFor(() => expect(rendered(container)).toEqual(range(0, 83)))
    expect(element.scrollHeight).toBe(4200)
  })

  test('scrollToIndex uses getItemLayout, viewPosition, and viewOffset', async () => {
    const ref = createRef<VirtualizedListInstance<Item>>()
    const { container } = mount(list(100, { getItemLayout, ref }))
    const element = scroller(container)
    // The visible length comes with the first layout.
    await waitFor(() => expect(rendered(container).length).toBeGreaterThan(10))

    ref.current?.scrollToIndex({ index: 40, animated: false })
    expect(element.scrollTop).toBe(2000)
    // viewPosition 1 puts the cell at the bottom edge; viewOffset lifts it 10 px.
    ref.current?.scrollToIndex({ index: 40, viewPosition: 1, viewOffset: 10, animated: false })
    expect(element.scrollTop).toBe(1840)
    ref.current?.scrollToOffset({ offset: 75, animated: false })
    expect(element.scrollTop).toBe(75)
    ref.current?.scrollToItem({ item: { key: 'x', label: 'x' }, animated: false })
    expect(element.scrollTop).toBe(75)
    ref.current?.scrollToEnd({ animated: false })
    expect(element.scrollTop).toBe(4800)
    expect(() => ref.current?.scrollToIndex({ index: 100 })).toThrow(/out of range/)
  })

  test('a scroll to a cell with no measure calls onScrollToIndexFailed, or throws', () => {
    const ref = createRef<VirtualizedListInstance<Item>>()
    const onScrollToIndexFailed = vi.fn()
    mount(list(100, { ref, onScrollToIndexFailed }))
    ref.current?.scrollToIndex({ index: 90 })
    expect(onScrollToIndexFailed).toHaveBeenCalledWith(expect.objectContaining({ index: 90 }))

    const bare = createRef<VirtualizedListInstance<Item>>()
    mount(list(100, { ref: bare }))
    expect(() => bare.current?.scrollToIndex({ index: 90 })).toThrow(
      /getItemLayout or onScrollToIndexFailed/,
    )
  })

  test('initialScrollIndex shows its cell in the first paint', () => {
    const { container } = mount(list(100, { getItemLayout, initialScrollIndex: 30 }))
    expect(scroller(container).scrollTop).toBe(1500)
    expect(rendered(container)).toEqual(range(30, 39))
  })

  test('onEndReached waits for the last cell in the window', async () => {
    const onEndReached = vi.fn()
    const { container } = mount(
      list(100, { getItemLayout, onEndReached, onEndReachedThreshold: 0.5 }),
    )
    await nextFrames()
    expect(onEndReached).not.toHaveBeenCalled()
    scroller(container).scrollTop = 4800
    await waitFor(() => expect(onEndReached).toHaveBeenCalledTimes(1))
    expect(onEndReached.mock.calls[0]?.[0]).toEqual({ distanceFromEnd: 0 })
    expect(rendered(container)).toContain(99)
  })

  test('onViewableItemsChanged reports the cells in the viewport', async () => {
    const onViewableItemsChanged = vi.fn()
    const { container } = mount(list(100, { onViewableItemsChanged }))
    await waitFor(() => expect(viewableIndices(onViewableItemsChanged)).toEqual([0, 1, 2, 3]))
    await waitFor(() => expect(rendered(container)).toHaveLength(44))
    scroller(container).scrollTop = 1000
    await waitFor(() => expect(viewableIndices(onViewableItemsChanged)).toEqual([20, 21, 22, 23]))
    const info = onViewableItemsChanged.mock.calls.at(-1)?.[0] as ViewableItemsChangedInfo<Item>
    expect(info.viewableItems[0]).toEqual({
      index: 20,
      item: { key: 'k20', label: 'Item 20' },
      key: 'k20',
      isViewable: true,
    })
  })

  test('a focused cell keeps a viewport of cells on each side rendered', async () => {
    const { container } = mount(
      list(1000, { getItemLayout, windowSize: 1, renderItem: renderFocusRow }),
    )
    const element = scroller(container)
    element.scrollTop = 1500
    await waitFor(() => expect(rendered(container)).toContain(30))
    cellOf(container, 30).focus({ preventScroll: true })

    element.scrollTop = 25000
    await waitFor(() => expect(rendered(container)).toContain(500))
    const shown = rendered(container)
    // 200 px on each side of cell 30: cells 26 to 34.
    expect(shown.filter((index) => index > 9 && index < 100)).toEqual(range(26, 34))
  })

  test('the closest sticky header before the window stays rendered', async () => {
    const { container } = mount(
      list(1000, { getItemLayout, windowSize: 1, initialNumToRender: 1, stickyHeaderIndices: [5] }),
    )
    scroller(container).scrollTop = 2000
    await waitFor(() => expect(rendered(container)).toContain(40))
    const shown = rendered(container)
    expect(shown).toContain(5)
    expect(shown).not.toContain(20)
    const wrapper = cellOf(container, 5).parentElement?.parentElement as HTMLElement
    expect(getComputedStyle(wrapper).position).toBe('sticky')
  })

  test('a stuck sticky cell is measured at its layout place', async () => {
    const ref = createRef<VirtualizedListInstance<Item>>()
    const { container } = mount(list(100, { ref, stickyHeaderIndices: [2] }))
    await waitFor(() => expect(rendered(container)).toHaveLength(44))
    const element = scroller(container)
    element.scrollTop = 300
    // The window grows, and the new cells make the list measure every cell, the stuck one too.
    await waitFor(() => expect(rendered(container)).toContain(49))
    await nextFrames()
    ref.current?.scrollToIndex({ index: 2, animated: false })
    expect(element.scrollTop).toBe(100)
  })

  test('disableVirtualization renders no spacer', () => {
    const { container } = mount(list(100, { getItemLayout, disableVirtualization: true }))
    expect(rendered(container)).toEqual(range(0, 9))
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  test('a horizontal right-to-left list counts offsets from the right edge', async () => {
    const ref = createRef<VirtualizedListInstance<Item>>()
    const { container } = mount(
      <View style={{ direction: 'rtl' }}>
        {list(1000, {
          ref,
          horizontal: true,
          getItemLayout,
          windowSize: 1,
          renderItem: renderColumn,
          style: { width: 200 },
        })}
      </View>,
    )
    const element = container.firstElementChild?.firstElementChild as HTMLElement
    ref.current?.scrollToIndex({ index: 500, animated: false })
    expect(element.scrollLeft).toBe(-25000)
    await waitFor(() => expect(rendered(container)).toContain(500))
    // The start of the flow is the right edge: cell 500 sits at the right edge of the viewport.
    expect(cellOf(container, 500).getBoundingClientRect().right).toBeCloseTo(
      element.getBoundingClientRect().right,
    )
  })

  test('a horizontal right-to-left list measures its cells from the right edge', async () => {
    const onViewableItemsChanged = vi.fn()
    mount(
      <View style={{ direction: 'rtl' }}>
        {list(100, {
          horizontal: true,
          renderItem: renderColumn,
          onViewableItemsChanged,
          style: { width: 200 },
        })}
      </View>,
    )
    await waitFor(() => expect(viewableIndices(onViewableItemsChanged)).toEqual([0, 1, 2, 3]))
  })

  test('header, footer, and empty components', () => {
    const extra = {
      ListHeaderComponent: <Text>Head</Text>,
      ListFooterComponent: <Text>Foot</Text>,
      ListEmptyComponent: <Text>Nothing</Text>,
    }
    const { container, rerender } = mount(list(0, extra))
    expect(container.textContent).toBe('HeadNothingFoot')
    rerender(list(2, extra))
    expect(container.textContent).toBe('HeadItem 0Item 1Foot')
  })

  test('reads any collection through getItem and getItemCount', () => {
    const collection = {
      size: 3,
      at: (index: number) => ({ key: `c${index}`, label: `Cell ${index}` }),
    }
    const { container } = mount(
      <VirtualizedList<Item>
        data={collection}
        getItem={(data, index) => data.at(index)}
        getItemCount={(data) => data.size}
        renderItem={renderRow}
      />,
    )
    expect(container.textContent).toBe('Cell 0Cell 1Cell 2')
  })

  test('hasMore tells if the window reaches the last item', () => {
    const long = createRef<VirtualizedListInstance<Item>>()
    const short = createRef<VirtualizedListInstance<Item>>()
    mount(list(100, { getItemLayout, ref: long }))
    mount(list(5, { getItemLayout, ref: short }))
    expect(long.current?.hasMore()).toBe(true)
    expect(short.current?.hasMore()).toBe(false)
  })

  test('items with no key or id log one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(
      <VirtualizedList<string>
        data={['a', 'b']}
        getItem={(data, index) => data[index]}
        getItemCount={(data) => data.length}
        renderItem={({ item }) => <Text>{item}</Text>}
      />,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/missing keys for items/))
  })

  test('a list with no getItemCount throws', () => {
    // Out of act(), React reports a render error and doesn't throw it.
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(<VirtualizedList<Item> data={items(2)} getItem={getItem} renderItem={renderRow} />),
    ).toThrow(/"getItemCount" prop must be provided/)
  })

  test('maintainVisibleContentPosition keeps the items in place when items come at the start', async () => {
    const config = { minIndexForVisible: 0 }
    const before = items(100)
    const added = Array.from({ length: 10 }, (_, index) => ({
      key: `n${index}`,
      label: `New ${index}`,
    }))
    const props = { getItemLayout, maintainVisibleContentPosition: config }
    const { container, rerender } = mount(list(100, { ...props, data: before }))
    const element = scroller(container)
    element.scrollTop = 1000
    await waitFor(() => expect(rendered(container)).toContain(23))

    rerender(list(110, { ...props, data: [...added, ...before] }))
    // Ten rows of 50 px came at the start: Item 20 is still at the top.
    expect(element.scrollTop).toBe(1500)
    await waitFor(() => {
      const item20 = Array.from(container.querySelectorAll('[data-index]')).find(
        (cell) => cell.textContent === 'Item 20',
      )
      expect(item20?.getBoundingClientRect().top).toBeCloseTo(element.getBoundingClientRect().top)
    })
  })

  test('a server render has the first batch and the spacers', () => {
    const html = renderToString(
      <StyleRegistryProvider registry={createStyleRegistry()}>
        {list(100, { getItemLayout })}
      </StyleRegistryProvider>,
    )
    expect(html.match(/data-index=/g)).toHaveLength(10)
    expect(html).toContain('height:4500px')
  })
})
