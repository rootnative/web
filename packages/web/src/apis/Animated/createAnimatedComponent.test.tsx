import { act, createRef, type ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { View, type ViewInstance, type ViewProps } from '../../components/View'
import { cleanup, render } from '../../test/render'
import { Animated } from './index'

afterEach(cleanup)

const first = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement

// A microtask runs the detach of a node that an unmount or a render dropped.
const flushDetach = () => new Promise<void>((resolve) => queueMicrotask(resolve))

// A View that counts its renders.
const onCountingRender = vi.fn()
const CountingView = (props: ViewProps): ReactNode => {
  onCountingRender()
  return <View {...props} />
}
const AnimatedCountingView = Animated.createAnimatedComponent(CountingView)

// A component with a prop that isn't a style, as a chart or an SVG shape has. It ignores its ref.
const onProbeRender = vi.fn<(progress: number) => void>()
const Probe = ({ progress }: { progress: number }): ReactNode => {
  onProbeRender(progress)
  return null
}
const AnimatedProbe = Animated.createAnimatedComponent(Probe)

describe('Animated.View', () => {
  test('renders the current value of a node in its style', () => {
    const opacity = new Animated.Value(0.5)
    const { container } = render(<Animated.View style={{ opacity }} />)
    expect(getComputedStyle(first(container)).opacity).toBe('0.5')
  })

  test('a change of a style value writes to the element with no render', () => {
    const opacity = new Animated.Value(0)
    onCountingRender.mockClear()
    const { container } = render(<AnimatedCountingView style={{ opacity, width: 10 }} />)
    expect(onCountingRender).toHaveBeenCalledOnce()

    opacity.setValue(0.25)

    expect(first(container).style.opacity).toBe('0.25')
    expect(getComputedStyle(first(container)).opacity).toBe('0.25')
    expect(onCountingRender).toHaveBeenCalledOnce()
  })

  test('animates a transform from an interpolation and keeps its static parts', () => {
    const progress = new Animated.Value(0)
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 100] })
    const { container } = render(
      <Animated.View style={{ transform: [{ translateX }, { rotate: '45deg' }] }} />,
    )

    progress.setValue(0.5)

    const transform = first(container).style.transform
    expect(transform).toContain('translateX(50px)')
    expect(transform).toContain('rotate(45deg)')
  })

  test('a node inside an object, with the keys that give one CSS property together', () => {
    const radius = new Animated.Value(2)
    const height = new Animated.Value(1)
    const { container } = render(
      <Animated.View
        style={{
          shadowColor: 'black',
          shadowOpacity: 1,
          shadowRadius: radius,
          shadowOffset: { width: 0, height },
        }}
      />,
    )

    radius.setValue(8)
    height.setValue(4)

    expect(first(container).style.boxShadow).toContain('0px 4px 8px')
  })

  test('a render after a frame writes the current values again', () => {
    const opacity = new Animated.Value(0)
    const { container, rerender } = render(
      <Animated.View style={{ opacity, backgroundColor: 'red' }} />,
    )
    opacity.setValue(1)
    expect(first(container).style.backgroundColor).toBe('rgb(255, 0, 0)')

    opacity.resetAnimation()
    rerender(<Animated.View style={{ opacity }} />)

    expect(first(container).style.opacity).toBe('0')
    expect(first(container).style.backgroundColor).toBe('')
  })

  test('a render with the same nodes keeps the graph, and a new node replaces it', async () => {
    const opacity = new Animated.Value(0)
    const { rerender } = render(<Animated.View style={{ opacity, width: 10 }} />)
    const [styleNode] = opacity.__getChildren()

    rerender(<Animated.View style={{ opacity, width: 20 }} />)
    await flushDetach()
    expect(opacity.__getChildren()).toHaveLength(1)
    expect(opacity.__getChildren()[0]).toBe(styleNode)

    const other = new Animated.Value(1)
    rerender(<Animated.View style={{ opacity: other }} />)
    await flushDetach()
    expect(opacity.__getChildren()).toHaveLength(0)
    expect(other.__getChildren()).toHaveLength(1)
  })

  test('an unmount detaches the graph and stops the animation of its values', async () => {
    const opacity = new Animated.Value(0)
    const { unmount } = render(<Animated.View style={{ opacity }} />)
    const done = vi.fn()
    Animated.timing(opacity, { toValue: 1, duration: 10_000, useNativeDriver: true }).start(done)

    unmount()
    await flushDetach()

    expect(opacity.__getChildren()).toHaveLength(0)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
  })

  test('the ref gets the element, with the methods of a host instance', () => {
    const ref = createRef<ViewInstance>()
    render(<Animated.View ref={ref} style={{ opacity: new Animated.Value(1) }} />)
    expect(ref.current).toBeInstanceOf(HTMLElement)
    expect(typeof ref.current?.measure).toBe('function')
  })

  test('has a display name', () => {
    expect((AnimatedCountingView as { displayName?: string }).displayName).toBe(
      'Animated(CountingView)',
    )
  })
})

describe('Animated.Text', () => {
  test('renders its text and animates its color', () => {
    const progress = new Animated.Value(0)
    const color = progress.interpolate({ inputRange: [0, 1], outputRange: ['red', 'blue'] })
    const { container } = render(<Animated.Text style={{ color }}>Hello</Animated.Text>)
    expect(first(container).textContent).toBe('Hello')

    progress.setValue(1)

    expect(first(container).style.color).toBe('rgb(0, 0, 255)')
  })
})

describe('a prop that is not a style', () => {
  test('renders the component again with the new value', () => {
    const progress = new Animated.Value(0.2)
    onProbeRender.mockClear()
    render(<AnimatedProbe progress={progress} />)
    expect(onProbeRender).toHaveBeenLastCalledWith(0.2)

    act(() => progress.setValue(0.7))

    expect(onProbeRender).toHaveBeenLastCalledWith(0.7)
  })
})

describe('Animated.event', () => {
  test('sets each mapped value from the event, then calls the listener', () => {
    const scrollY = new Animated.Value(0)
    const listener = vi.fn()
    const handler = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
      listener,
    })
    const event = { nativeEvent: { contentOffset: { x: 0, y: 30 } } }

    handler(event)

    expect(scrollY.__getValue()).toBe(30)
    expect(listener).toHaveBeenCalledExactlyOnceWith(event)
  })

  test('skips a null mapping, as for the event of a PanResponder', () => {
    const dx = new Animated.Value(0)
    const handler = Animated.event([null, { dx }], { useNativeDriver: false })
    handler({ nativeEvent: {} }, { dx: 12, dy: 3 })
    expect(dx.__getValue()).toBe(12)
  })

  test("in development, throws on the first event that doesn't fit the mapping", () => {
    const y = new Animated.Value(0)
    const handler = Animated.event([{ nativeEvent: { y } }], { useNativeDriver: false })
    expect(() => handler({ nativeEvent: { y: '30' } })).toThrow(
      'Bad mapping of event key y, should be number but got string',
    )
  })
})
