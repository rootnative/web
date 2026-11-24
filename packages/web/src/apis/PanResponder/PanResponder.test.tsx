import type { CDPSession } from '@vitest/browser-playwright'
import { afterEach, describe, expect, test, vi, type Mock } from 'vitest'
import { cdp, server } from 'vitest/browser'

import { Pressable } from '../../components/Pressable'
import { ScrollView } from '../../components/ScrollView'
import { View } from '../../components/View'
import type { GestureResponderEvent } from '../../events/types'
import { cleanup, render } from '../../test/render'
import { canTouch, sendTouch } from '../../test/touch'
import {
  PanResponder,
  resetPanResponder,
  type PanResponderCallbacks,
  type PanResponderGestureState,
} from './index'

type Spies = {
  [K in keyof PanResponderCallbacks]-?: Mock<NonNullable<PanResponderCallbacks[K]>>
}

const yes = (): boolean => true
const no = (): boolean => false
const byDx = (min: number) => (_event: GestureResponderEvent, state: PanResponderGestureState) =>
  Math.abs(state.dx) > min

afterEach(() => {
  cleanup()
  resetPanResponder()
})

const pointer = (
  element: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  x: number,
  y: number,
  pointerId = 1,
): void => {
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
    }),
  )
}

const spyConfig = (overrides: Partial<Spies> = {}): Spies => ({
  onStartShouldSetPanResponder: vi.fn(no),
  onStartShouldSetPanResponderCapture: vi.fn(no),
  onMoveShouldSetPanResponder: vi.fn(no),
  onMoveShouldSetPanResponderCapture: vi.fn(no),
  onPanResponderGrant: vi.fn(),
  onPanResponderStart: vi.fn(),
  onPanResponderMove: vi.fn(),
  onPanResponderEnd: vi.fn(),
  onPanResponderRelease: vi.fn(),
  onPanResponderReject: vi.fn(),
  onPanResponderTerminate: vi.fn(),
  onPanResponderTerminationRequest: vi.fn(yes),
  onShouldBlockNativeResponder: vi.fn(yes),
  ...overrides,
})

// One finger down at (x, y): the pointer event, then the touch event, as a browser sends them.
const fingerDown = (element: HTMLElement, x: number, y: number): void => {
  pointer(element, 'pointerdown', x, y)
  sendTouch(element, 'touchstart', x, y)
}
// A move of that finger. Returns true when the page canceled the browser's pan.
const fingerMove = (element: HTMLElement, x: number, y: number): boolean => {
  pointer(element, 'pointermove', x, y)
  return sendTouch(element, 'touchmove', x, y).defaultPrevented
}
const fingerUp = (element: HTMLElement, x: number, y: number): void => {
  pointer(element, 'pointerup', x, y)
  sendTouch(element, 'touchend', x, y)
}

const box = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement

const style = { width: 100, height: 100 }

describe('PanResponder', () => {
  test('create returns pointer handlers and a null interaction handle', () => {
    const responder = PanResponder.create({})
    expect(new Set(Object.keys(responder.panHandlers))).toEqual(
      new Set([
        'onPointerCancel',
        'onPointerDown',
        'onPointerDownCapture',
        'onPointerMove',
        'onPointerMoveCapture',
        'onPointerUp',
      ]),
    )
    expect(responder.getInteractionHandle()).toBeNull()
  })

  test('a start that should not set gets no gesture', () => {
    const config = spyConfig()
    const { container } = render(
      <View style={style} {...PanResponder.create(config).panHandlers} />,
    )
    const element = box(container)
    pointer(element, 'pointerdown', 10, 10)
    pointer(element, 'pointermove', 20, 20)
    pointer(element, 'pointerup', 20, 20)
    expect(config.onStartShouldSetPanResponder).toHaveBeenCalledTimes(1)
    expect(config.onPanResponderGrant).not.toHaveBeenCalled()
    expect(config.onPanResponderMove).not.toHaveBeenCalled()
    expect(config.onPanResponderRelease).not.toHaveBeenCalled()
  })

  test('grant, start, move, end, release, with the gesture state', () => {
    const config = spyConfig({ onStartShouldSetPanResponder: vi.fn(yes) })
    const { container } = render(
      <View style={style} {...PanResponder.create(config).panHandlers} />,
    )
    const element = box(container)

    pointer(element, 'pointerdown', 10, 20)
    expect(config.onPanResponderGrant).toHaveBeenCalledTimes(1)
    expect(config.onPanResponderStart).toHaveBeenCalledTimes(1)
    const [grantEvent, grantState] = config.onPanResponderGrant.mock.calls[0] as [
      { nativeEvent: Record<string, unknown> },
      Record<string, number>,
    ]
    expect(grantState.x0).toBe(10)
    expect(grantState.y0).toBe(20)
    expect(grantState.numberActiveTouches).toBe(1)
    expect(grantEvent.nativeEvent.pageX).toBe(10)
    expect(grantEvent.nativeEvent.touches).toHaveLength(1)
    expect(grantEvent.nativeEvent.identifier).toBe(1)

    pointer(element, 'pointermove', 40, 25)
    expect(config.onPanResponderMove).toHaveBeenCalledTimes(1)
    const state = config.onPanResponderMove.mock.calls[0]?.[1] as Record<string, number>
    expect(state.dx).toBe(30)
    expect(state.dy).toBe(5)
    expect(state.moveX).toBe(40)
    expect(state.moveY).toBe(25)
    expect(Number.isFinite(state.vx)).toBe(true)

    pointer(element, 'pointerup', 40, 25)
    expect(config.onPanResponderEnd).toHaveBeenCalledTimes(1)
    expect(config.onPanResponderRelease).toHaveBeenCalledTimes(1)
    expect(config.onPanResponderMove.mock.calls[0]?.[1]).toBe(
      config.onPanResponderRelease.mock.calls[0]?.[1],
    )
  })

  test('a move can set the responder; dx resets at the grant', () => {
    const config = spyConfig({
      onMoveShouldSetPanResponder: vi.fn(byDx(5)),
    })
    const { container } = render(
      <View style={style} {...PanResponder.create(config).panHandlers} />,
    )
    const element = box(container)

    pointer(element, 'pointerdown', 0, 0)
    pointer(element, 'pointermove', 3, 0)
    expect(config.onPanResponderGrant).not.toHaveBeenCalled()
    pointer(element, 'pointermove', 8, 0)
    expect(config.onPanResponderGrant).toHaveBeenCalledTimes(1)
    const state = config.onPanResponderGrant.mock.calls[0]?.[1] as Record<string, number>
    expect(state.x0).toBe(8)
    expect(state.dx).toBe(0)

    pointer(element, 'pointermove', 18, 0)
    const moved = config.onPanResponderMove.mock.calls[0]?.[1] as Record<string, number>
    expect(moved.dx).toBe(10)
  })

  test('the deepest responder wins the bubble phase, and the parent is not asked', () => {
    const parent = spyConfig({ onStartShouldSetPanResponder: vi.fn(yes) })
    const child = spyConfig({ onStartShouldSetPanResponder: vi.fn(yes) })
    const { container } = render(
      <View style={style} {...PanResponder.create(parent).panHandlers}>
        <View
          testID="child"
          style={{ width: 50, height: 50 }}
          {...PanResponder.create(child).panHandlers}
        />
      </View>,
    )
    const target = container.querySelector('[data-testid="child"]') as HTMLElement
    pointer(target, 'pointerdown', 10, 10)
    expect(child.onPanResponderGrant).toHaveBeenCalledTimes(1)
    expect(parent.onStartShouldSetPanResponder).not.toHaveBeenCalled()
    expect(parent.onPanResponderGrant).not.toHaveBeenCalled()

    pointer(target, 'pointermove', 20, 20)
    expect(child.onPanResponderMove).toHaveBeenCalledTimes(1)
    expect(parent.onPanResponderMove).not.toHaveBeenCalled()
  })

  test('a capture should-set on the parent wins before the child', () => {
    const parent = spyConfig({ onStartShouldSetPanResponderCapture: vi.fn(yes) })
    const child = spyConfig({ onStartShouldSetPanResponder: vi.fn(yes) })
    const { container } = render(
      <View style={style} {...PanResponder.create(parent).panHandlers}>
        <View
          testID="child"
          style={{ width: 50, height: 50 }}
          {...PanResponder.create(child).panHandlers}
        />
      </View>,
    )
    const target = container.querySelector('[data-testid="child"]') as HTMLElement
    pointer(target, 'pointerdown', 10, 10)
    expect(parent.onPanResponderGrant).toHaveBeenCalledTimes(1)
    expect(child.onStartShouldSetPanResponder).not.toHaveBeenCalled()
  })

  test('a parent takes over on move when the child allows termination', () => {
    const parent = spyConfig({
      onMoveShouldSetPanResponderCapture: vi.fn(byDx(20)),
    })
    const child = spyConfig({ onStartShouldSetPanResponder: vi.fn(yes) })
    const { container } = render(
      <View style={style} {...PanResponder.create(parent).panHandlers}>
        <View
          testID="child"
          style={{ width: 50, height: 50 }}
          {...PanResponder.create(child).panHandlers}
        />
      </View>,
    )
    const target = container.querySelector('[data-testid="child"]') as HTMLElement
    pointer(target, 'pointerdown', 0, 0)
    pointer(target, 'pointermove', 10, 0)
    expect(child.onPanResponderMove).toHaveBeenCalledTimes(1)
    pointer(target, 'pointermove', 30, 0)
    expect(child.onPanResponderTerminationRequest).toHaveBeenCalledTimes(1)
    expect(child.onPanResponderTerminate).toHaveBeenCalledTimes(1)
    expect(parent.onPanResponderGrant).toHaveBeenCalledTimes(1)
    expect(child.onPanResponderMove).toHaveBeenCalledTimes(1)

    pointer(target, 'pointermove', 40, 0)
    expect(parent.onPanResponderMove).toHaveBeenCalledTimes(1)
    expect(child.onPanResponderMove).toHaveBeenCalledTimes(1)
    pointer(target, 'pointerup', 40, 0)
    expect(parent.onPanResponderRelease).toHaveBeenCalledTimes(1)
    expect(child.onPanResponderRelease).not.toHaveBeenCalled()
  })

  test('a refused termination rejects the parent', () => {
    const parent = spyConfig({ onMoveShouldSetPanResponderCapture: vi.fn(yes) })
    const child = spyConfig({
      onStartShouldSetPanResponder: vi.fn(yes),
      onPanResponderTerminationRequest: vi.fn(no),
    })
    const { container } = render(
      <View style={style} {...PanResponder.create(parent).panHandlers}>
        <View
          testID="child"
          style={{ width: 50, height: 50 }}
          {...PanResponder.create(child).panHandlers}
        />
      </View>,
    )
    const target = container.querySelector('[data-testid="child"]') as HTMLElement
    pointer(target, 'pointerdown', 0, 0)
    pointer(target, 'pointermove', 10, 0)
    expect(parent.onPanResponderReject).toHaveBeenCalledTimes(1)
    expect(parent.onPanResponderGrant).not.toHaveBeenCalled()
    expect(child.onPanResponderTerminate).not.toHaveBeenCalled()
    expect(child.onPanResponderMove).toHaveBeenCalledTimes(1)
  })

  test('pointercancel terminates', () => {
    const config = spyConfig({ onStartShouldSetPanResponder: vi.fn(yes) })
    const { container } = render(
      <View style={style} {...PanResponder.create(config).panHandlers} />,
    )
    const element = box(container)
    pointer(element, 'pointerdown', 0, 0)
    pointer(element, 'pointercancel', 0, 0)
    expect(config.onPanResponderTerminate).toHaveBeenCalledTimes(1)
    expect(config.onPanResponderRelease).not.toHaveBeenCalled()

    pointer(element, 'pointerdown', 0, 0)
    expect(config.onPanResponderGrant).toHaveBeenCalledTimes(2)
  })

  test('two pointers: the centroid moves the gesture, release waits for the last one', () => {
    const config = spyConfig({ onStartShouldSetPanResponder: vi.fn(yes) })
    const { container } = render(
      <View style={style} {...PanResponder.create(config).panHandlers} />,
    )
    const element = box(container)

    pointer(element, 'pointerdown', 0, 0, 1)
    pointer(element, 'pointerdown', 20, 0, 2)
    expect(config.onPanResponderStart).toHaveBeenCalledTimes(2)
    const started = config.onPanResponderStart.mock.calls[1]?.[0] as GestureResponderEvent
    expect(started.nativeEvent.touches).toHaveLength(2)
    const startState = config.onPanResponderStart.mock.calls[1]?.[1] as {
      numberActiveTouches: number
    }
    expect(startState.numberActiveTouches).toBe(2)

    pointer(element, 'pointermove', 40, 0, 2)
    const moved = config.onPanResponderMove.mock.calls[0]?.[1] as Record<string, number>
    expect(moved.dx).toBe(10)

    pointer(element, 'pointerup', 40, 0, 2)
    expect(config.onPanResponderEnd).toHaveBeenCalledTimes(1)
    expect(config.onPanResponderRelease).not.toHaveBeenCalled()
    pointer(element, 'pointerup', 0, 0, 1)
    expect(config.onPanResponderRelease).toHaveBeenCalledTimes(1)
  })

  test('a responder inside a pressable takes the start, and the pressable gets no press', () => {
    const config = spyConfig({ onStartShouldSetPanResponder: vi.fn(yes) })
    const onPressIn = vi.fn()
    const onPress = vi.fn()
    const { container } = render(
      <Pressable onPressIn={onPressIn} onPress={onPress} style={style}>
        <View {...PanResponder.create(config).panHandlers} style={style} />
      </Pressable>,
    )
    const pressable = box(container)
    const inner = box(pressable)
    pointer(inner, 'pointerdown', 10, 10)
    pointer(inner, 'pointermove', 40, 10)
    pointer(inner, 'pointerup', 40, 10)
    expect(config.onPanResponderGrant).toHaveBeenCalledTimes(1)
    expect(config.onPanResponderMove).toHaveBeenCalledTimes(1)
    expect(config.onPanResponderRelease).toHaveBeenCalledTimes(1)
    expect(onPressIn).not.toHaveBeenCalled()
    expect(onPress).not.toHaveBeenCalled()
  })

  test('a pressable inside a responder takes the start, and a move can end its press', async () => {
    const config = spyConfig({
      onStartShouldSetPanResponder: vi.fn(yes),
      onMoveShouldSetPanResponder: vi.fn(byDx(5)),
    })
    const onPressIn = vi.fn()
    const onPressOut = vi.fn()
    const onPress = vi.fn()
    const { container } = render(
      <View {...PanResponder.create(config).panHandlers} style={style}>
        <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={onPress} style={style} />
      </View>,
    )
    const inner = box(box(container))
    pointer(inner, 'pointerdown', 10, 10)
    expect(onPressIn).toHaveBeenCalledTimes(1)
    expect(config.onStartShouldSetPanResponder).not.toHaveBeenCalled()
    expect(config.onPanResponderGrant).not.toHaveBeenCalled()

    pointer(inner, 'pointermove', 40, 10)
    expect(config.onPanResponderGrant).toHaveBeenCalledTimes(1)
    // The press-out waits for the minimum press time.
    await expect.poll(() => onPressOut.mock.calls.length).toBe(1)

    pointer(inner, 'pointerup', 40, 10)
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    expect(config.onPanResponderRelease).toHaveBeenCalledTimes(1)
    expect(onPress).not.toHaveBeenCalled()
  })

  test('stops the browser scroll while it holds the gesture', () => {
    const config = spyConfig({ onStartShouldSetPanResponder: vi.fn(yes) })
    const { container } = render(
      <View style={style} {...PanResponder.create(config).panHandlers} />,
    )
    const element = box(container)
    const touchMove = (): boolean =>
      !element.dispatchEvent(new Event('touchmove', { bubbles: true, cancelable: true }))

    expect(touchMove()).toBe(false)
    pointer(element, 'pointerdown', 10, 10)
    expect(config.onShouldBlockNativeResponder).toHaveBeenCalledTimes(1)
    expect(touchMove()).toBe(true)
    pointer(element, 'pointerup', 10, 10)
    expect(touchMove()).toBe(false)
  })

  test('lets the browser scroll when onShouldBlockNativeResponder returns false', () => {
    const config = spyConfig({
      onStartShouldSetPanResponder: vi.fn(yes),
      onShouldBlockNativeResponder: vi.fn(no),
    })
    const { container } = render(
      <View style={style} {...PanResponder.create(config).panHandlers} />,
    )
    const element = box(container)
    pointer(element, 'pointerdown', 10, 10)
    expect(element.dispatchEvent(new Event('touchmove', { bubbles: true, cancelable: true }))).toBe(
      true,
    )
  })

  // A browser starts its own pan at the first `touchmove`. On native, only a scroll view competes.
  describe.skipIf(!canTouch)('a move responder that has not decided yet', () => {
    test('holds the touch where nothing scrolls along the move, until it decides', () => {
      const config = spyConfig({ onMoveShouldSetPanResponder: vi.fn(byDx(30)) })
      const { container } = render(
        <View style={style} {...PanResponder.create(config).panHandlers} />,
      )
      const element = box(container)
      const root = document.documentElement
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth)

      fingerDown(element, 10, 10)
      expect(fingerMove(element, 30, 12)).toBe(true)
      expect(config.onPanResponderGrant).not.toHaveBeenCalled()
      expect(fingerMove(element, 50, 12)).toBe(true)
      expect(config.onPanResponderGrant).toHaveBeenCalledTimes(1)
      fingerUp(element, 50, 12)
      expect(config.onPanResponderRelease).toHaveBeenCalledTimes(1)
    })

    test('gives the touch to a ScrollView that scrolls along the move', () => {
      const config = spyConfig({ onMoveShouldSetPanResponder: vi.fn(byDx(30)) })
      const { container } = render(
        <ScrollView style={{ height: 100 }}>
          <View
            testID="target"
            style={{ height: 300 }}
            {...PanResponder.create(config).panHandlers}
          />
        </ScrollView>,
      )
      const element = container.querySelector('[data-testid="target"]') as HTMLElement

      fingerDown(element, 10, 10)
      expect(fingerMove(element, 12, 30)).toBe(false)
      fingerUp(element, 12, 30)

      // The ScrollView doesn't scroll across.
      fingerDown(element, 10, 10)
      expect(fingerMove(element, 30, 12)).toBe(true)
      fingerUp(element, 30, 12)
    })

    test('gives the touch to the page when the page scrolls along the move', () => {
      const config = spyConfig({ onMoveShouldSetPanResponder: vi.fn(byDx(30)) })
      const { container } = render(
        <View>
          <View style={style} {...PanResponder.create(config).panHandlers} />
          <View style={{ height: 3 * window.innerHeight }} />
        </View>,
      )
      const element = box(container).firstElementChild as HTMLElement
      const root = document.documentElement
      expect(root.scrollHeight).toBeGreaterThan(root.clientHeight)

      fingerDown(element, 10, 10)
      expect(fingerMove(element, 12, 30)).toBe(false)
      fingerUp(element, 12, 30)
    })

    test('leaves the touch to the browser for a responder that asks only at the start', () => {
      const { container } = render(
        <View
          style={style}
          {...PanResponder.create({ onStartShouldSetPanResponder: no }).panHandlers}
        />,
      )
      const element = box(container)
      fingerDown(element, 10, 10)
      expect(fingerMove(element, 30, 12)).toBe(false)
      fingerUp(element, 30, 12)
    })

    test('leaves two fingers to the browser, for zoom', () => {
      const config = spyConfig({ onMoveShouldSetPanResponder: vi.fn(byDx(30)) })
      const { container } = render(
        <View style={style} {...PanResponder.create(config).panHandlers} />,
      )
      const element = box(container)
      fingerDown(element, 10, 10)
      const fingers = [
        new Touch({ identifier: 1, target: element, clientX: 30, clientY: 12 }),
        new Touch({ identifier: 2, target: element, clientX: 60, clientY: 40 }),
      ]
      const pinch = new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: fingers,
        changedTouches: fingers,
      })
      element.dispatchEvent(pinch)
      expect(pinch.defaultPrevented).toBe(false)
    })
  })

  // Real touch input, so Chromium makes its own decision to pan. Its first `touchmove` comes after
  // 16 px of movement, and a pan that starts there ends the pointer events with `pointercancel`.
  describe.runIf(server.browser === 'chromium')('with real touch input in Chromium', () => {
    test('a responder that decides after 40 px keeps the touch', async () => {
      const config = spyConfig({ onMoveShouldSetPanResponder: vi.fn(byDx(40)) })
      const { container } = render(
        <View style={{ width: 300, height: 100 }} {...PanResponder.create(config).panHandlers} />,
      )
      const rect = box(container).getBoundingClientRect()
      // CDP takes the point in the page of the test runner, which holds this page in a frame.
      const frame = window.frameElement?.getBoundingClientRect() ?? { left: 0, top: 0 }
      const x = frame.left + rect.left + 20
      const y = frame.top + rect.top + 50
      const session: CDPSession = cdp()
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', dx: number): Promise<unknown> =>
        session.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' ? [] : [{ x: x + dx, y }],
        })

      await touch('touchStart', 0)
      for (let dx = 2; dx <= 80; dx += 2) await touch('touchMove', dx)
      await touch('touchEnd', 80)

      await expect.poll(() => config.onPanResponderRelease.mock.calls.length).toBe(1)
      expect(config.onPanResponderGrant).toHaveBeenCalledTimes(1)
      expect(config.onPanResponderTerminate).not.toHaveBeenCalled()
    })
  })

  test('a new gesture gets a new stateID', () => {
    const config = spyConfig({ onStartShouldSetPanResponder: vi.fn(yes) })
    const { container } = render(
      <View style={style} {...PanResponder.create(config).panHandlers} />,
    )
    const element = box(container)
    pointer(element, 'pointerdown', 0, 0)
    pointer(element, 'pointerup', 0, 0)
    pointer(element, 'pointerdown', 0, 0)
    const first = config.onPanResponderGrant.mock.calls[0]?.[1] as { stateID: number }
    const second = config.onPanResponderGrant.mock.calls[1]?.[1] as { stateID: number }
    expect(second.stateID).not.toBe(first.stateID)
  })
})
