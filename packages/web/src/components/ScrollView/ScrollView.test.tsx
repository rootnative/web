import type { CDPSession } from '@vitest/browser-playwright'
import { createRef } from 'react'
import { afterEach, describe, expect, onTestFinished, test, vi } from 'vitest'
import { cdp, server } from 'vitest/browser'

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

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const tall = (count = 20): React.ReactElement[] =>
  Array.from({ length: count }, (_, i) => <View key={i} style={{ height: 50 }} />)

const wide = (count = 20): React.ReactElement[] =>
  Array.from({ length: count }, (_, i) => <View key={i} style={{ width: 50, height: 50 }} />)

const pointerDown = (element: HTMLElement, pointerType = 'touch'): void => {
  element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType }))
}

function RefreshWrapper(props: { children?: React.ReactNode }): React.ReactElement {
  return <div data-testid="refresh">{props.children}</div>
}

const pointerUp = (): void => {
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }))
}

// snapToStart={false} keeps the browser's scroll snap off, so the ScrollView snaps after each
// scroll. The list rests at 290 before the snap props come, because WebKit starts a smooth scroll
// from the offset that it drew last. Then a scroll to 291 snaps back to 200, and this waits until
// that smooth scroll is under way. A user scroll to 330 then snaps to 400.
const offsetList = (snaps: boolean): React.ReactElement => (
  <ScrollView
    horizontal
    snapToOffsets={snaps ? [200, 400, 600, 800] : undefined}
    snapToStart={false}
    style={{ width: 100 }}
  >
    {wide()}
  </ScrollView>
)

const renderSnapping = async (): Promise<HTMLElement> => {
  const { container, rerender } = render(offsetList(false))
  const element = scroller(container)
  element.scrollLeft = 290
  await delay(200)
  rerender(offsetList(true))
  await frame()
  element.scrollLeft = 291
  await waitFor(() => {
    expect(element.scrollLeft).toBeGreaterThan(200)
    expect(element.scrollLeft).toBeLessThan(291)
  })
  return element
}

// The places of the markers for the browser's scroll snap, along the axis.
const snapMarkers = (element: HTMLElement, axis: 'x' | 'y'): number[] => {
  const layer = element.children[1]
  if (layer === undefined) return []
  return Array.from(layer.children, (marker) => {
    const { style } = marker as HTMLElement
    return Number.parseFloat(axis === 'x' ? style.insetInlineStart : style.insetBlockStart)
  })
}

// The scroll-snap-stop values of the markers that a touch adds.
const snapStops = (disableIntervalMomentum: boolean): string[] => {
  const { container } = render(
    <ScrollView
      horizontal
      snapToInterval={100}
      disableIntervalMomentum={disableIntervalMomentum}
      style={{ width: 100 }}
    >
      {wide()}
    </ScrollView>,
  )
  const element = scroller(container)
  pointerDown(element)
  const layer = element.children[1] as HTMLElement
  const values = Array.from(
    layer.children,
    (marker) => (marker as HTMLElement).style.scrollSnapStop,
  )
  pointerUp()
  return [...new Set(values)]
}

// Waits until the scroll offset stays the same for 300 ms.
const waitForRest = async (element: HTMLElement): Promise<void> => {
  let last = Number.NaN
  await vi.waitFor(
    () => {
      const now = element.scrollLeft
      const moved = now !== last
      last = now
      if (moved) throw new Error(`still scrolling at ${now}`)
    },
    { timeout: 5000, interval: 300 },
  )
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

    // A right-to-left scroller has a scrollLeft of 0 or less.
    test('in a right-to-left layout, snaps from the right edge', async () => {
      const media = installFakeMatchMedia()
      media.get('(prefers-reduced-motion: reduce)').matches = true
      try {
        const { container } = render(
          <View style={{ direction: 'rtl' }}>
            <ScrollView horizontal snapToInterval={100} style={{ width: 100 }}>
              {wide()}
            </ScrollView>
          </View>,
        )
        const element = container.firstElementChild?.firstElementChild as HTMLElement
        element.scrollLeft = -130
        await waitFor(() => expect(element.scrollLeft).toBe(-100))
      } finally {
        media.restore()
      }
    })

    describe("the browser's scroll snap", () => {
      test('a touch turns it on, with a marker at each snap offset', async () => {
        const { container } = render(
          <ScrollView horizontal snapToInterval={100} style={{ width: 100 }}>
            {wide()}
          </ScrollView>,
        )
        const element = scroller(container)
        pointerDown(element)
        expect(element.style.scrollSnapType).toBe('x mandatory')
        expect(snapMarkers(element, 'x')).toEqual([0, 100, 200, 300, 400, 500, 600, 700, 800, 900])
        // The browser snaps this scroll, and the ScrollView doesn't scroll after it.
        element.scrollLeft = 130
        pointerUp()
        await waitFor(() => expect(element.style.scrollSnapType).toBe(''))
        expect(element.scrollLeft).toBe(100)
        expect(snapMarkers(element, 'x')).toEqual([])
      })

      test('a press with no scroll turns it off', async () => {
        const { container } = render(
          <ScrollView snapToInterval={50} style={{ height: 100 }}>
            {tall()}
          </ScrollView>,
        )
        const element = scroller(container)
        pointerDown(element, 'pen')
        expect(element.style.scrollSnapType).toBe('y mandatory')
        expect(snapMarkers(element, 'y')).toEqual(Array.from({ length: 19 }, (_, i) => i * 50))
        pointerUp()
        await waitFor(() => expect(element.style.scrollSnapType).toBe(''))
        expect(snapMarkers(element, 'y')).toEqual([])
      })

      test('a mouse leaves it off', () => {
        const { container } = render(
          <ScrollView horizontal snapToInterval={100} style={{ width: 100 }}>
            {wide()}
          </ScrollView>,
        )
        const element = scroller(container)
        pointerDown(element, 'mouse')
        expect(element.style.scrollSnapType).toBe('')
        pointerUp()
      })

      test('a wheel turns it on until the wheel stops', async () => {
        const { container } = render(
          <ScrollView horizontal pagingEnabled style={{ width: 100 }}>
            {wide()}
          </ScrollView>,
        )
        const element = scroller(container)
        const wheel = (): boolean =>
          element.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaX: 30 }))
        wheel()
        expect(element.style.scrollSnapType).toBe('x mandatory')
        expect(snapMarkers(element, 'x')).toEqual([0, 100, 200, 300, 400, 500, 600, 700, 800, 900])
        await delay(100)
        wheel()
        await delay(100)
        expect(element.style.scrollSnapType).toBe('x mandatory')
        await waitFor(() => expect(element.style.scrollSnapType).toBe(''))
      })

      test('the markers follow snapToAlignment and snapToOffsets', () => {
        const centered = render(
          <ScrollView
            horizontal
            snapToInterval={60}
            snapToAlignment="center"
            style={{ width: 100 }}
          >
            {wide()}
          </ScrollView>,
        )
        // Items of 60 centered in 100 start 20 before the item: 40, 100, 160, and so on.
        pointerDown(scroller(centered.container))
        expect(snapMarkers(scroller(centered.container), 'x')).toEqual([
          0,
          ...Array.from({ length: 15 }, (_, i) => 40 + i * 60),
        ])
        pointerUp()

        const listed = render(
          <ScrollView horizontal snapToOffsets={[400, 150]} style={{ width: 100 }}>
            {wide()}
          </ScrollView>,
        )
        pointerDown(scroller(listed.container))
        expect(snapMarkers(scroller(listed.container), 'x')).toEqual([0, 150, 400, 900])
        pointerUp()
      })

      test('in a right-to-left layout, the markers count from the right edge', async () => {
        const { container } = render(
          <View style={{ direction: 'rtl' }}>
            <ScrollView horizontal snapToInterval={100} style={{ width: 100 }}>
              {wide()}
            </ScrollView>
          </View>,
        )
        const element = container.firstElementChild?.firstElementChild as HTMLElement
        pointerDown(element)
        element.scrollLeft = -130
        pointerUp()
        await waitFor(() => expect(element.style.scrollSnapType).toBe(''))
        expect(element.scrollLeft).toBe(-100)
      })

      test('if it stops off a snap offset, the snap after the scroll finishes it', async () => {
        const media = installFakeMatchMedia()
        media.get('(prefers-reduced-motion: reduce)').matches = true
        try {
          const { container } = render(
            <ScrollView horizontal snapToInterval={100} style={{ width: 100 }}>
              {wide()}
            </ScrollView>,
          )
          const element = scroller(container)
          pointerDown(element)
          // The markers stay, but the browser doesn't snap.
          element.style.scrollSnapType = 'none'
          element.scrollLeft = 130
          pointerUp()
          await waitFor(() => expect(element.scrollLeft).toBe(100))
          expect(snapMarkers(element, 'x')).toEqual([])
        } finally {
          media.restore()
        }
      })

      test('snapToOffsets with a free start leaves it off', () => {
        const { container } = render(
          <ScrollView horizontal snapToOffsets={[150]} snapToStart={false} style={{ width: 100 }}>
            {wide()}
          </ScrollView>,
        )
        const element = scroller(container)
        pointerDown(element)
        expect(element.style.scrollSnapType).toBe('')
        expect(snapMarkers(element, 'x')).toEqual([])
        pointerUp()
      })

      test('disableIntervalMomentum makes each marker stop the scroll', () => {
        expect(snapStops(true)).toEqual(['always'])
        expect(snapStops(false)).toEqual(['normal'])
      })
    })

    // As if the last scroll event of the scroll came after its scrollend.
    test('a scroll event after scrollend still lets the wheel snap', async () => {
      const media = installFakeMatchMedia()
      try {
        const { container } = render(
          <ScrollView
            horizontal
            snapToOffsets={[200, 400, 600, 800]}
            snapToStart={false}
            style={{ width: 100 }}
          >
            {wide()}
          </ScrollView>,
        )
        const element = scroller(container)
        const ended = new Promise((resolve) => {
          element.addEventListener('scrollend', resolve, { once: true })
        })
        element.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaX: 330 }))
        element.scrollLeft = 330
        await ended
        element.dispatchEvent(new Event('scroll'))
        await waitFor(() => expect(element.scrollLeft).toBe(400))
      } finally {
        media.restore()
      }
    })

    describe('a user scroll during the smooth scroll of a snap', () => {
      test('with the wheel snaps again after it', async () => {
        const media = installFakeMatchMedia()
        try {
          const element = await renderSnapping()
          element.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaX: 240 }))
          element.scrollLeft = 330
          await waitFor(() => expect(element.scrollLeft).toBe(400))
        } finally {
          media.restore()
        }
      })

      test('with a touch snaps again after it', async () => {
        const media = installFakeMatchMedia()
        try {
          const element = await renderSnapping()
          pointerDown(element)
          element.scrollLeft = 330
          await frame()
          pointerUp()
          await waitFor(() => expect(element.scrollLeft).toBe(400))
        } finally {
          media.restore()
        }
      })
    })

    describe.runIf(server.browser === 'chromium')('with real touch input in Chromium', () => {
      // A fling with the JS snap alone goes on, stops, and then scrolls back to a snap offset. The
      // browser's snap must be on until the browser's scroll ends. Chromium on Linux can stop that
      // scroll short of a snap offset (CI run 45695647730), and then the JS snap finishes it.
      test('a fling moves one way after the finger lifts, and stops on a snap offset', async () => {
        const { container } = render(
          <ScrollView horizontal snapToInterval={100} style={{ width: 200 }}>
            {wide(60)}
          </ScrollView>,
        )
        const element = scroller(container)
        const rect = element.getBoundingClientRect()
        // CDP takes the point in the page of the test runner, which holds this page in a frame.
        const runner = window.frameElement?.getBoundingClientRect() ?? { left: 0, top: 0 }
        const y = runner.top + rect.top + 25
        const at = (x: number): { x: number; y: number } => ({ x: runner.left + rect.left + x, y })

        let lifted = false
        let browserScrollEnded = false
        let sampling = true
        const afterLift: number[] = []
        // The snap types of the frames where the list moves after the lift.
        const snapTypes = new Set<string>()
        const start = performance.now()
        const timeline: string[] = []
        const note = (what: string): void => {
          const snapType = element.style.scrollSnapType || 'no snap'
          timeline.push(
            `${Math.round(performance.now() - start)} ms ${what} ${element.scrollLeft} ${snapType}`,
          )
        }
        const sample = (): void => {
          if (lifted && !browserScrollEnded) {
            if (element.scrollLeft !== afterLift.at(-1)) {
              snapTypes.add(element.style.scrollSnapType)
              note('frame')
            }
            afterLift.push(element.scrollLeft)
          }
          if (sampling) requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
        // A frame runs its scroll events before its frame callbacks. So the sampler skips the frame
        // of the scrollend, where the ScrollView has already turned the browser's snap off.
        element.addEventListener('scrollend', () => {
          note('scrollend')
          if (lifted) browserScrollEnded = true
        })

        const session: CDPSession = cdp()
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [at(180)],
        })
        for (let x = 165; x >= 30; x -= 15) {
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [at(x)],
          })
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        note('lift')
        lifted = true
        await vi.waitFor(() => expect(browserScrollEnded, timeline.join(', ')).toBe(true), {
          timeout: 5000,
          interval: 20,
        })
        await waitForRest(element)
        sampling = false
        note('rest')
        const log = timeline.join(', ')

        expect([...snapTypes], log).toEqual(['x mandatory'])
        const steps = afterLift
          .slice(1)
          .map((value, index) => Math.sign(value - (afterLift[index] ?? value)))
        expect(new Set(steps.filter((step) => step !== 0)).size, log).toBeLessThanOrEqual(1)
        const end = element.scrollLeft
        expect(end, log).toBeGreaterThan(0)
        expect(end % 100, log).toBe(0)
        expect(element.style.scrollSnapType, log).toBe('')
      })
    })

    describe.runIf(server.browser === 'chromium')('with real wheel input in Chromium', () => {
      // A slow CDP call can split the spin, so the test checks for a snap point past the start.
      test('a quick spin of the wheel ends on a snap point past the start', async () => {
        const media = installFakeMatchMedia()
        media.get('(prefers-reduced-motion: reduce)').matches = true
        try {
          const { container } = render(
            <ScrollView horizontal snapToInterval={100} style={{ width: 100 }}>
              {wide()}
            </ScrollView>,
          )
          const element = scroller(container)
          const rect = element.getBoundingClientRect()
          // CDP takes the point in the page of the test runner, which holds this page in a frame.
          const runner = window.frameElement?.getBoundingClientRect() ?? { left: 0, top: 0 }
          const point = { x: runner.left + rect.left + 50, y: runner.top + rect.top + 25 }
          const session: CDPSession = cdp()
          for (let step = 0; step < 4; step++) {
            await session.send('Input.dispatchMouseEvent', {
              type: 'mouseWheel',
              ...point,
              deltaX: 30,
              deltaY: 0,
            })
            await delay(50)
          }
          await delay(400)
          await waitFor(() => {
            expect(element.scrollLeft).toBeGreaterThan(0)
            expect(element.scrollLeft % 100).toBe(0)
          })
        } finally {
          media.restore()
        }
      })
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

    test('without scrollTo on the element, as in jsdom, mounts and scrolls nothing', () => {
      const scrollTo = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTo')
      Reflect.deleteProperty(Element.prototype, 'scrollTo')
      onTestFinished(() => {
        if (scrollTo) Object.defineProperty(Element.prototype, 'scrollTo', scrollTo)
      })
      expect(typeof document.body.scrollTo).toBe('undefined')

      const ref = createRef<ScrollViewInstance>()
      const { container } = render(
        <ScrollView ref={ref} style={{ height: 100 }}>
          {tall()}
        </ScrollView>,
      )
      ref.current?.scrollTo({ y: 100, animated: false })
      ref.current?.scrollTo(0, 200)
      ref.current?.scrollToEnd()
      expect(scroller(container).scrollTop).toBe(0)
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

const rows = (labels: string[]): React.ReactElement[] =>
  labels.map((label) => <View key={label} data-label={label} style={{ height: 50 }} />)

const columns = (labels: string[]): React.ReactElement[] =>
  labels.map((label) => <View key={label} style={{ width: 50, height: 50 }} />)

const labels = (prefix: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => `${prefix}${i}`)

// A header and 20 rows, in a 100 px viewport.
const headerPage = (minIndexForVisible: number, headerHeight: number): React.ReactElement => (
  <ScrollView maintainVisibleContentPosition={{ minIndexForVisible }} style={{ height: 100 }}>
    <View key="header" style={{ height: headerHeight }} />
    {rows(labels('a', 20))}
  </ScrollView>
)

describe('ScrollView maintainVisibleContentPosition', () => {
  test('keeps the first visible child in place when children are added above it', () => {
    const config = { minIndexForVisible: 0 }
    const { container, rerender } = render(
      <ScrollView maintainVisibleContentPosition={config} style={{ height: 100 }}>
        {rows(labels('a', 20))}
      </ScrollView>,
    )
    const element = scroller(container)
    element.scrollTop = 200
    rerender(
      <ScrollView maintainVisibleContentPosition={config} style={{ height: 100 }}>
        {rows([...labels('n', 2), ...labels('a', 20)])}
      </ScrollView>,
    )
    // Two rows of 50 px came above: a4 is still at the top.
    expect(element.scrollTop).toBe(300)
  })

  test('autoscrollToTopThreshold goes to the start when the offset was near it', async () => {
    const config = { minIndexForVisible: 0, autoscrollToTopThreshold: 50 }
    const view = (children: React.ReactElement[]) => (
      <ScrollView maintainVisibleContentPosition={config} style={{ height: 100 }}>
        {children}
      </ScrollView>
    )
    const near = render(view(rows(labels('a', 20))))
    scroller(near.container).scrollTop = 20
    near.rerender(view(rows([...labels('n', 2), ...labels('a', 20)])))
    await waitFor(() => expect(scroller(near.container).scrollTop).toBe(0))

    const far = render(view(rows(labels('a', 20))))
    scroller(far.container).scrollTop = 200
    far.rerender(view(rows([...labels('n', 2), ...labels('a', 20)])))
    await frame()
    expect(scroller(far.container).scrollTop).toBe(300)
  })

  test('minIndexForVisible skips the children before it', () => {
    // At the top, the header is the first visible child, and it doesn't move when it grows.
    const first = render(headerPage(0, 20))
    first.rerender(headerPage(0, 120))
    expect(scroller(first.container).scrollTop).toBe(0)

    // With minIndexForVisible 1, a0 is the anchor, and it moves down by 100 px.
    const second = render(headerPage(1, 20))
    second.rerender(headerPage(1, 120))
    expect(scroller(second.container).scrollTop).toBe(100)
  })

  test('a horizontal right-to-left ScrollView counts from the right edge', () => {
    const config = { minIndexForVisible: 0 }
    const view = (children: React.ReactElement[]) => (
      <View style={{ direction: 'rtl' }}>
        <ScrollView horizontal maintainVisibleContentPosition={config} style={{ width: 100 }}>
          {children}
        </ScrollView>
      </View>
    )
    const { container, rerender } = render(view(columns(labels('a', 20))))
    const element = container.firstElementChild?.firstElementChild as HTMLElement
    element.scrollLeft = -200
    rerender(view(columns([...labels('n', 2), ...labels('a', 20)])))
    expect(element.scrollLeft).toBe(-300)
  })

  test('turns off the scroll anchoring of the browser', () => {
    const { container } = render(
      <ScrollView maintainVisibleContentPosition={{ minIndexForVisible: 0 }}>{tall(2)}</ScrollView>,
    )
    // An engine with no scroll anchoring has no overflow-anchor to turn off.
    if (CSS.supports('overflow-anchor', 'none')) {
      expect(getComputedStyle(scroller(container)).overflowAnchor).toBe('none')
    }
  })
})
