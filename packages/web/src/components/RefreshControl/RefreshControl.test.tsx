import { act, createRef, type ReactElement, useState } from 'react'
import { afterEach, beforeEach, describe, expect, type Mock, test, vi } from 'vitest'

import { cleanup, render } from '../../test/render'
import { ScrollView } from '../ScrollView'
import { View } from '../View'
import { RefreshControl } from './index'
import type { RefreshControlProps } from './types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const indicator = (container: HTMLElement): HTMLElement =>
  container.querySelector('[role="progressbar"]') as HTMLElement

const arc = (container: HTMLElement): SVGCircleElement =>
  indicator(container).querySelector('circle') as SVGCircleElement

const tall = (): ReactElement[] =>
  Array.from({ length: 20 }, (_, i) => <View key={i} style={{ height: 50 }} />)

describe('RefreshControl', () => {
  test('wraps its child and hides the indicator while not refreshing', () => {
    const { container } = render(
      <RefreshControl refreshing={false}>
        <View testID="child" />
      </RefreshControl>,
    )
    const area = container.firstElementChild as HTMLElement
    expect(area.firstElementChild?.getAttribute('data-testid')).toBe('child')
    expect(area.getAttribute('aria-busy')).toBe('false')
    expect(getComputedStyle(area).overflow).toBe('hidden')

    const element = indicator(container)
    expect(element.hasAttribute('data-refreshing')).toBe(false)
    expect(element.getAttribute('aria-hidden')).toBe('true')
    expect(getComputedStyle(element).opacity).toBe('0')
  })

  test('shows the indicator at rest while refreshing, under progressViewOffset', () => {
    const { container } = render(<RefreshControl refreshing progressViewOffset={10} />)
    const element = indicator(container)
    expect(element.hasAttribute('data-refreshing')).toBe(true)
    expect(element.getAttribute('aria-hidden')).toBe('false')
    expect((container.firstElementChild as HTMLElement).getAttribute('aria-busy')).toBe('true')
    const style = getComputedStyle(element)
    expect(style.opacity).toBe('1')
    // 10 + 64 - 40: the top of the disc rests 24 px under the offset.
    expect(new DOMMatrix(style.transform).f).toBe(34)
  })

  test('large is a 56 px disc', () => {
    const { container } = render(<RefreshControl refreshing size="large" />)
    const style = getComputedStyle(indicator(container))
    expect(style.width).toBe('56px')
    expect(new DOMMatrix(style.transform).f).toBe(8)
  })

  test('colors, progressBackgroundColor, and title', () => {
    const { container } = render(
      <RefreshControl
        refreshing
        colors={['#ff0000', '#00ff00']}
        progressBackgroundColor="#0000ff"
        title="Loading"
      />,
    )
    expect(arc(container).getAttribute('stroke')).toBe('rgb(255,0,0)')
    expect(getComputedStyle(indicator(container)).backgroundColor).toBe('rgb(0, 0, 255)')
    expect(indicator(container).getAttribute('aria-label')).toBe('Loading')
  })

  test('tintColor colors the arc when colors is empty, and black is the default', () => {
    const tinted = render(<RefreshControl refreshing tintColor="#00ff00" />)
    expect(arc(tinted.container).getAttribute('stroke')).toBe('rgb(0,255,0)')
    const plain = render(<RefreshControl refreshing />)
    expect(arc(plain.container).getAttribute('stroke')).toBe('#000000')
  })

  test('the View props and the ref go to the wrapper', () => {
    const ref = createRef<HTMLElement>()
    const { container } = render(<RefreshControl ref={ref} refreshing={false} testID="area" />)
    expect(ref.current).toBe(container.firstElementChild)
    expect(ref.current?.getAttribute('data-testid')).toBe('area')
  })

  test('ScrollView gives it the props that place the box, and the scroller fills it', () => {
    const { container } = render(
      <ScrollView
        style={{ height: 120, marginTop: 8, backgroundColor: '#ff0000' }}
        refreshControl={<RefreshControl refreshing={false} />}
      >
        {tall()}
      </ScrollView>,
    )
    const area = container.firstElementChild as HTMLElement
    const scroller = area.firstElementChild as HTMLElement
    expect(getComputedStyle(area).height).toBe('120px')
    expect(getComputedStyle(area).marginTop).toBe('8px')
    expect(getComputedStyle(area).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(scroller).backgroundColor).toBe('rgb(255, 0, 0)')
    expect(scroller.clientHeight).toBe(120)
    expect(scroller.scrollHeight).toBe(1000)
  })
})

// Firefox and Safari on a desktop can't build touch events, so these run where the engine can.
const canTouch = typeof Touch === 'function' && typeof TouchEvent === 'function'

describe.skipIf(!canTouch)('RefreshControl pull', () => {
  let container: HTMLElement
  let onRefresh: Mock<() => void>

  // An app that sets `refreshing` in `onRefresh`, as the docs show.
  function App(props: { controlled: boolean } & Partial<RefreshControlProps>): ReactElement {
    const { controlled, ...control } = props
    const [refreshing, setRefreshing] = useState(false)
    return (
      <ScrollView
        style={{ height: 200 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              onRefresh()
              if (controlled) setRefreshing(true)
            }}
            {...control}
          />
        }
      >
        {tall()}
      </ScrollView>
    )
  }

  const scroller = (): HTMLElement =>
    (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement

  const send = (type: string, y: number, x = 100): TouchEvent => {
    const target = scroller().firstElementChild as HTMLElement
    const point = new Touch({ identifier: 7, target, clientX: x, clientY: y })
    const event = new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: type === 'touchend' || type === 'touchcancel' ? [] : [point],
      changedTouches: [point],
    })
    act(() => {
      target.dispatchEvent(event)
    })
    return event
  }

  const mount = (props: { controlled?: boolean } & Partial<RefreshControlProps> = {}): void => {
    container = render(<App controlled={props.controlled ?? true} {...props} />).container
  }

  beforeEach(() => {
    onRefresh = vi.fn()
  })

  test('a pull past the target calls onRefresh and the indicator rests', () => {
    mount()
    send('touchstart', 100)
    expect(send('touchmove', 150).defaultPrevented).toBe(true)
    expect(send('touchmove', 300).defaultPrevented).toBe(true)
    send('touchend', 300)

    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(indicator(container).hasAttribute('data-refreshing')).toBe(true)
    expect(indicator(container).style.transform).toBe('')
  })

  test('the indicator follows the finger at half the speed', () => {
    mount()
    send('touchstart', 100)
    send('touchmove', 200)
    expect(indicator(container).style.transform).toContain('+ 50px')
    expect(arc(container).style.strokeDasharray).not.toBe('')
  })

  test('a short pull goes back and does not refresh', () => {
    mount()
    send('touchstart', 100)
    send('touchmove', 200)
    send('touchend', 200)

    expect(onRefresh).not.toHaveBeenCalled()
    expect(indicator(container).hasAttribute('data-refreshing')).toBe(false)
    expect(indicator(container).style.transform).toBe('')
    expect(arc(container).style.strokeDasharray).toBe('')
  })

  test('when the app does not set refreshing, the indicator goes back after the release', async () => {
    mount({ controlled: false })
    send('touchstart', 100)
    send('touchmove', 400)
    send('touchend', 400)
    expect(indicator(container).hasAttribute('data-refreshing')).toBe(true)

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(indicator(container).hasAttribute('data-refreshing')).toBe(false)
  })

  test('the app keeps the indicator while it refreshes', async () => {
    mount()
    send('touchstart', 100)
    send('touchmove', 400)
    send('touchend', 400)

    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(indicator(container).hasAttribute('data-refreshing')).toBe(true)
    expect((container.firstElementChild as HTMLElement).getAttribute('aria-busy')).toBe('true')
  })

  test('the browser scrolls when the scroller is not at the top', () => {
    mount()
    scroller().scrollTop = 100
    send('touchstart', 100)
    expect(send('touchmove', 300).defaultPrevented).toBe(false)
    send('touchend', 300)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  test('a first move up or across leaves the gesture to the browser', () => {
    mount()
    send('touchstart', 100)
    expect(send('touchmove', 90).defaultPrevented).toBe(false)
    expect(send('touchmove', 300).defaultPrevented).toBe(false)
    send('touchend', 300)

    send('touchstart', 100, 100)
    expect(send('touchmove', 110, 160).defaultPrevented).toBe(false)
    send('touchend', 300, 160)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  test('no pull with enabled={false}', () => {
    mount({ enabled: false })
    send('touchstart', 100)
    expect(send('touchmove', 300).defaultPrevented).toBe(false)
    send('touchend', 300)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  test('no pull while refreshing', () => {
    mount()
    send('touchstart', 100)
    send('touchmove', 400)
    send('touchend', 400)
    send('touchstart', 100)
    expect(send('touchmove', 400).defaultPrevented).toBe(false)
    send('touchend', 400)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  test('touchcancel does not refresh', () => {
    mount()
    send('touchstart', 100)
    send('touchmove', 400)
    send('touchcancel', 400)
    expect(onRefresh).not.toHaveBeenCalled()
    expect(indicator(container).style.transform).toBe('')
  })
})
