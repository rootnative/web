import { afterEach, describe, expect, test, vi, type Mock } from 'vitest'

import { Pressable } from '../../components/Pressable'
import { View } from '../../components/View'
import type { GestureResponderEvent } from '../../events/types'
import { cleanup, render } from '../../test/render'
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
