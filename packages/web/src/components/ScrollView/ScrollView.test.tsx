import { createRef } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { installFakeMatchMedia } from '../../test/matchMedia'
import { cleanup, render } from '../../test/render'
import { View } from '../View'
import { ScrollView } from './index'
import type { ScrollEvent, ScrollViewInstance } from './types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const scroller = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement
const content = (container: HTMLElement): HTMLElement =>
  scroller(container).firstElementChild as HTMLElement

const frame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })

// Scroll events arrive on the next frame. scrollend arrives later.
const waitFor = async (check: () => void): Promise<void> => {
  await vi.waitFor(check, { timeout: 2000, interval: 10 })
}

const tall = (count = 20): React.ReactElement[] =>
  Array.from({ length: count }, (_, i) => <View key={i} style={{ height: 50 }} />)

const wide = (count = 20): React.ReactElement[] =>
  Array.from({ length: count }, (_, i) => <View key={i} style={{ width: 50, height: 50 }} />)

const pointerDown = (element: HTMLElement): void => {
  element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }))
}

function RefreshWrapper(props: { children?: React.ReactNode }): React.ReactElement {
  return <div data-testid="refresh">{props.children}</div>
}

const pointerUp = (): void => {
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }))
}

describe('ScrollView', () => {
  test('a vertical scroller with the content in a View', () => {
    const { container } = render(
      <ScrollView style={{ height: 100 }} contentContainerStyle={{ padding: 4 }}>
        {tall()}
      </ScrollView>,
    )
    const element = scroller(container)
    const computed = getComputedStyle(element)
    expect(computed.overflowY).toBe('auto')
    expect(computed.overflowX).toBe('hidden')
    expect(computed.flexShrink).toBe('1')
    expect(element.clientHeight).toBe(100)
    expect(element.scrollHeight).toBe(1008)

    const inner = content(container)
    expect(getComputedStyle(inner).paddingTop).toBe('4px')
    expect(inner.children).toHaveLength(20)
  })

  test('horizontal lays the content out in a row', () => {
    const { container } = render(
      <ScrollView horizontal style={{ width: 100 }}>
        {wide()}
      </ScrollView>,
    )
    const element = scroller(container)
    expect(getComputedStyle(element).overflowX).toBe('auto')
    expect(getComputedStyle(element).overflowY).toBe('hidden')
    expect(getComputedStyle(content(container)).flexDirection).toBe('row')
    expect(element.scrollWidth).toBe(1000)
  })

  test('scrollEnabled={false} hides the overflow', () => {
    const { container } = render(
      <ScrollView scrollEnabled={false} style={{ height: 100 }}>
        {tall()}
      </ScrollView>,
    )
    expect(getComputedStyle(scroller(container)).overflowY).toBe('hidden')
  })

  test('showsVerticalScrollIndicator={false} hides the scrollbar', () => {
    const { container } = render(
      <ScrollView showsVerticalScrollIndicator={false} style={{ height: 100 }}>
        {tall()}
      </ScrollView>,
    )
    expect(getComputedStyle(scroller(container)).scrollbarWidth).toBe('none')
  })

  test('contentOffset sets the initial position', () => {
    const { container } = render(
      <ScrollView contentOffset={{ x: 0, y: 120 }} style={{ height: 100 }}>
        {tall()}
      </ScrollView>,
    )
    expect(scroller(container).scrollTop).toBe(120)
  })

  test('centerContent centers a short content', () => {
    const { container } = render(
      <ScrollView centerContent style={{ height: 100 }}>
        <View style={{ height: 20 }} />
      </ScrollView>,
    )
    const inner = content(container)
    expect(getComputedStyle(inner).justifyContent).toBe('center')
    expect((inner.firstElementChild as HTMLElement).offsetTop).toBe(40)
  })

  test('onContentSizeChange reports the content size', async () => {
    const onContentSizeChange = vi.fn()
    render(
      <ScrollView style={{ height: 100, width: 200 }} onContentSizeChange={onContentSizeChange}>
        {tall()}
      </ScrollView>,
    )
    await waitFor(() => expect(onContentSizeChange).toHaveBeenCalled())
    const [width, height] = onContentSizeChange.mock.calls[0] as [number, number]
    expect(height).toBe(1000)
    expect(width).toBeGreaterThan(0)
  })

  test('aria and testID land on the scroller', () => {
    const { container } = render(
      <ScrollView testID="feed" aria-label="Feed" role="list" style={{ height: 100 }}>
        {tall()}
      </ScrollView>,
    )
    const element = scroller(container)
    expect(element.tagName).toBe('UL')
    expect(element.getAttribute('data-testid')).toBe('feed')
    expect(element.getAttribute('aria-label')).toBe('Feed')
  })

  describe('onScroll', () => {
    test('carries the React Native scroll fields on nativeEvent', async () => {
      const onScroll = vi.fn()
      const { container } = render(
        <ScrollView style={{ height: 100, width: 200 }} onScroll={onScroll}>
          {tall()}
        </ScrollView>,
      )
      scroller(container).scrollTop = 60
      await waitFor(() => expect(onScroll).toHaveBeenCalled())

      const event = onScroll.mock.calls[0]?.[0] as ScrollEvent
      expect(event.nativeEvent.contentOffset).toEqual({ x: 0, y: 60 })
      expect(event.nativeEvent.contentSize.height).toBe(1000)
      expect(event.nativeEvent.layoutMeasurement.height).toBe(100)
      expect(event.nativeEvent.zoomScale).toBe(1)
      expect(event.nativeEvent.contentInset).toEqual({ top: 0, left: 0, bottom: 0, right: 0 })
      expect(event.nativeEvent).toBeInstanceOf(Event)
    })

    test('ignores a scroll of a nested scroller', async () => {
      const outer = vi.fn()
      const inner = vi.fn()
      const { container } = render(
        <ScrollView style={{ height: 100 }} onScroll={outer}>
          <ScrollView style={{ height: 50 }} onScroll={inner} testID="inner">
            {tall()}
          </ScrollView>
          {tall()}
        </ScrollView>,
      )
      const nested = container.querySelector('[data-testid="inner"]') as HTMLElement
      nested.scrollTop = 30
      await waitFor(() => expect(inner).toHaveBeenCalled())
      await frame()
      expect(outer).not.toHaveBeenCalled()
    })
  })

  describe('sequence', () => {
    test('a wheel or programmatic scroll is a momentum sequence', async () => {
      const calls: string[] = []
      const { container } = render(
        <ScrollView
          style={{ height: 100 }}
          onScrollBeginDrag={() => calls.push('beginDrag')}
          onScrollEndDrag={() => calls.push('endDrag')}
          onMomentumScrollBegin={() => calls.push('momentumBegin')}
          onMomentumScrollEnd={(event) => {
            calls.push('momentumEnd')
            expect(event.nativeEvent.contentOffset.y).toBe(80)
          }}
        >
          {tall()}
        </ScrollView>,
      )
      scroller(container).scrollTop = 80
      await waitFor(() => expect(calls).toEqual(['momentumBegin', 'momentumEnd']))
    })

    test('a touch drag is beginDrag, endDrag, then momentum', async () => {
      const calls: string[] = []
      const { container } = render(
        <ScrollView
          style={{ height: 100 }}
          onScrollBeginDrag={() => calls.push('beginDrag')}
          onScrollEndDrag={(event) => {
            calls.push('endDrag')
            expect(event.nativeEvent.contentOffset.y).toBe(40)
          }}
          onMomentumScrollBegin={() => calls.push('momentumBegin')}
          onMomentumScrollEnd={() => calls.push('momentumEnd')}
        >
          {tall()}
        </ScrollView>,
      )
      const element = scroller(container)

      pointerDown(element)
      element.scrollTop = 40
      await waitFor(() => expect(calls).toEqual(['beginDrag']))
      pointerUp()
      expect(calls).toEqual(['beginDrag', 'endDrag'])

      element.scrollTop = 90
      await waitFor(() =>
        expect(calls).toEqual(['beginDrag', 'endDrag', 'momentumBegin', 'momentumEnd']),
      )
    })

    test('a drag that stops has no momentum', async () => {
      const calls: string[] = []
      const { container } = render(
        <ScrollView
          style={{ height: 100 }}
          onScrollBeginDrag={() => calls.push('beginDrag')}
          onScrollEndDrag={() => calls.push('endDrag')}
          onMomentumScrollBegin={() => calls.push('momentumBegin')}
          onMomentumScrollEnd={() => calls.push('momentumEnd')}
        >
          {tall()}
        </ScrollView>,
      )
      const element = scroller(container)
      pointerDown(element)
      element.scrollTop = 40
      await waitFor(() => expect(calls).toEqual(['beginDrag']))
      pointerUp()
      await new Promise((resolve) => {
        setTimeout(resolve, 300)
      })
      expect(calls).toEqual(['beginDrag', 'endDrag'])
    })

    test('keyboardDismissMode="on-drag" blurs the focused field', async () => {
      const { container } = render(
        <ScrollView style={{ height: 100 }} keyboardDismissMode="on-drag">
          <input data-testid="field" />
          {tall()}
        </ScrollView>,
      )
      const field = container.querySelector('[data-testid="field"]') as HTMLInputElement
      field.focus()
      expect(document.activeElement).toBe(field)

      const element = scroller(container)
      pointerDown(element)
      element.scrollTop = 40
      await waitFor(() => expect(document.activeElement).not.toBe(field))
      pointerUp()
    })
  })

  describe('snap', () => {
    test('snapToInterval settles on the nearest multiple', async () => {
      const media = installFakeMatchMedia()
      media.get('(prefers-reduced-motion: reduce)').matches = true
      try {
        const { container } = render(
          <ScrollView style={{ height: 100 }} snapToInterval={100}>
            {tall()}
          </ScrollView>,
        )
        const element = scroller(container)
        element.scrollTop = 130
        await waitFor(() => expect(element.scrollTop).toBe(100))
      } finally {
        media.restore()
      }
    })

    test('pagingEnabled snaps to the viewport size', async () => {
      const media = installFakeMatchMedia()
      media.get('(prefers-reduced-motion: reduce)').matches = true
      try {
        const { container } = render(
          <ScrollView horizontal pagingEnabled style={{ width: 100 }}>
            {wide()}
          </ScrollView>,
        )
        const element = scroller(container)
        element.scrollLeft = 160
        await waitFor(() => expect(element.scrollLeft).toBe(200))
      } finally {
        media.restore()
      }
    })
  })

  describe('sticky headers', () => {
    test('stickyHeaderIndices wrap the children in sticky Views', () => {
      const { container } = render(
        <ScrollView style={{ height: 100 }} stickyHeaderIndices={[0, 2]}>
          <View testID="a" />
          <View testID="b" />
          <View testID="c" />
        </ScrollView>,
      )
      const inner = content(container)
      expect(inner.children).toHaveLength(3)
      expect(getComputedStyle(inner.children[0] as HTMLElement).position).toBe('sticky')
      expect(getComputedStyle(inner.children[1] as HTMLElement).position).toBe('relative')
      expect(getComputedStyle(inner.children[2] as HTMLElement).position).toBe('sticky')
      expect(inner.children[0]?.querySelector('[data-testid="a"]')).not.toBeNull()
    })

    test('horizontal has no sticky headers', () => {
      const { container } = render(
        <ScrollView horizontal stickyHeaderIndices={[0]}>
          <View testID="a" />
        </ScrollView>,
      )
      expect(content(container).firstElementChild?.getAttribute('data-testid')).toBe('a')
    })

    test('stickyHeaderHiddenOnScroll hides on a scroll down and shows on a scroll up', async () => {
      const { container } = render(
        <ScrollView style={{ height: 100 }} stickyHeaderIndices={[0]} stickyHeaderHiddenOnScroll>
          <View style={{ height: 20 }} />
          {tall()}
        </ScrollView>,
      )
      const element = scroller(container)
      const header = content(container).firstElementChild as HTMLElement

      element.scrollTop = 200
      await waitFor(() => expect(header.style.transform).toBe('translateY(-100%)'))
      element.scrollTop = 100
      await waitFor(() => expect(header.style.transform).toBe(''))
    })
  })

  describe('ref', () => {
    test('is the element with the React Native methods', () => {
      const ref = createRef<ScrollViewInstance>()
      const { container } = render(
        <ScrollView ref={ref} style={{ height: 100 }}>
          {tall()}
        </ScrollView>,
      )
      expect(ref.current).toBe(scroller(container))
      expect(ref.current?.getScrollableNode()).toBe(scroller(container))
      expect(ref.current?.getNativeScrollRef()).toBe(scroller(container))
      expect(ref.current?.getInnerViewNode()).toBe(content(container))
      expect(ref.current?.getScrollResponder()).toBe(ref.current)
      expect(() => ref.current?.flashScrollIndicators()).not.toThrow()
    })

    test('scrollTo takes { x, y, animated } and the DOM forms', () => {
      const ref = createRef<ScrollViewInstance>()
      const { container } = render(
        <ScrollView ref={ref} style={{ height: 100 }}>
          {tall()}
        </ScrollView>,
      )
      const element = scroller(container)
      ref.current?.scrollTo({ y: 100, animated: false })
      expect(element.scrollTop).toBe(100)
      ref.current?.scrollTo(0, 200)
      expect(element.scrollTop).toBe(200)
      ref.current?.scrollTo({ top: 300 })
      expect(element.scrollTop).toBe(300)
    })

    test('scrollToEnd goes to the end of the axis', () => {
      const ref = createRef<ScrollViewInstance>()
      const { container } = render(
        <ScrollView ref={ref} horizontal style={{ width: 100 }}>
          {wide()}
        </ScrollView>,
      )
      ref.current?.scrollToEnd({ animated: false })
      expect(scroller(container).scrollLeft).toBe(900)
    })
  })

  test('refreshControl wraps the scroller', () => {
    const control = <RefreshWrapper />
    const { container } = render(
      <ScrollView style={{ height: 100 }} refreshControl={control}>
        {tall()}
      </ScrollView>,
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.getAttribute('data-testid')).toBe('refresh')
    expect(getComputedStyle(wrapper.firstElementChild as HTMLElement).overflowY).toBe('auto')
  })
})
