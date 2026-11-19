import { act, createRef, type ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { FlatListInstance } from '../../components/FlatList'
import { RefreshControl } from '../../components/RefreshControl'
import type { ScrollViewInstance } from '../../components/ScrollView'
import type { SectionListInstance } from '../../components/SectionList'
import { Text } from '../../components/Text'
import { View, type ViewInstance, type ViewProps } from '../../components/View'
import { cleanup, render } from '../../test/render'
import { resetWarnings } from '../../utils/warn'
import * as Animated from './AnimatedExports'

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

  test('animates a Color in a color style, and the layout and transform of a ValueXY', () => {
    const color = new Animated.Color('red')
    const position = new Animated.ValueXY({ x: 1, y: 2 })
    const { container } = render(
      <Animated.View
        style={[
          {
            backgroundColor: color,
            position: 'absolute',
            transform: position.getTranslateTransform(),
          },
          position.getLayout(),
        ]}
      />,
    )
    expect(getComputedStyle(first(container)).backgroundColor).toBe('rgb(255, 0, 0)')

    color.setValue('blue')
    position.setValue({ x: 10, y: 20 })

    const { style } = first(container)
    const computed = getComputedStyle(first(container))
    expect(style.backgroundColor).toBe('rgb(0, 0, 255)')
    expect([computed.left, computed.top]).toEqual(['10px', '20px'])
    expect(style.transform).toContain('translateX(10px)')
    expect(style.transform).toContain('translateY(20px)')
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

// Scroll events arrive on the next frame.
const waitFor = (check: () => void): Promise<void> =>
  vi.waitFor(check, { timeout: 2000, interval: 10 })

const onScrollY = (value: Animated.Value) =>
  Animated.event([{ nativeEvent: { contentOffset: { y: value } } }], { useNativeDriver: true })

const tall = <View style={{ height: 1000 }} />

describe('Animated.Image, Animated.ScrollView, Animated.FlatList, and Animated.SectionList', () => {
  test('Animated.Image animates its style on the element', () => {
    const opacity = new Animated.Value(1)
    const { container } = render(
      <Animated.Image
        source={{ uri: 'data:image/png;base64,AAAA' }}
        style={{ width: 4, height: 4, opacity }}
      />,
    )

    opacity.setValue(0.5)

    expect(first(container).style.opacity).toBe('0.5')
  })

  test('Animated.ScrollView sets a value from its scroll, and the ref gets the scroller', async () => {
    const offset = new Animated.Value(0)
    const ref = createRef<ScrollViewInstance>()
    const { container } = render(
      <Animated.ScrollView ref={ref} style={{ height: 100 }} onScroll={onScrollY(offset)}>
        {tall}
      </Animated.ScrollView>,
    )
    expect(ref.current).toBe(first(container))

    first(container).scrollTop = 60

    await waitFor(() => expect(offset.__getValue()).toBe(60))
  })

  test('Animated.ScrollView with a refreshControl writes the layout part of a frame to the refresh control', () => {
    const marginTop = new Animated.Value(0)
    const opacity = new Animated.Value(1)
    const ref = createRef<ScrollViewInstance>()
    const { container } = render(
      <Animated.ScrollView
        ref={ref}
        style={{ height: 100, marginTop, opacity }}
        refreshControl={<RefreshControl refreshing={false} />}
      >
        {tall}
      </Animated.ScrollView>,
    )
    const area = first(container)
    const scroller = ref.current as HTMLElement
    expect(scroller).not.toBe(area)
    expect(area.contains(scroller)).toBe(true)

    marginTop.setValue(20)
    opacity.setValue(0.5)

    expect(getComputedStyle(area).marginTop).toBe('20px')
    expect(getComputedStyle(scroller).marginTop).toBe('0px')
    expect(scroller.style.opacity).toBe('0.5')
  })

  test('Animated.FlatList renders its items with a value in its style, and the ref gets the list', () => {
    const opacity = new Animated.Value(1)
    const ref = createRef<FlatListInstance<string>>()
    const { container } = render(
      <Animated.FlatList
        ref={ref}
        data={['a', 'b']}
        renderItem={({ item }) => <Text>{String(item)}</Text>}
        style={{ opacity }}
      />,
    )
    expect(container.textContent).toBe('ab')
    expect(typeof ref.current?.scrollToIndex).toBe('function')

    act(() => opacity.setValue(0.25))

    expect(getComputedStyle(first(container)).opacity).toBe('0.25')
  })

  test('Animated.SectionList renders its sections and sets a value from its scroll', async () => {
    const offset = new Animated.Value(0)
    const ref = createRef<SectionListInstance>()
    const { container } = render(
      <Animated.SectionList
        ref={ref}
        sections={[{ title: 'A', data: ['a1', 'a2'] }]}
        renderItem={({ item }) => <Text>{String(item)}</Text>}
        renderSectionHeader={({ section }) => <Text>{String(section.title)}</Text>}
        ListFooterComponent={tall}
        style={{ height: 100 }}
        onScroll={onScrollY(offset)}
      />,
    )
    expect(container.textContent).toBe('Aa1a2')
    expect(typeof ref.current?.scrollToLocation).toBe('function')

    const scroller = ref.current?.getScrollableNode() as HTMLElement
    scroller.scrollTop = 40

    await waitFor(() => expect(offset.__getValue()).toBe(40))
  })
})

describe('forkEvent and unforkEvent', () => {
  test('forkEvent of a handler calls the handler and then the listener', () => {
    const calls: string[] = []
    const forked = Animated.forkEvent(
      () => calls.push('handler'),
      () => calls.push('listener'),
    ) as (...args: unknown[]) => void

    forked({ nativeEvent: {} })

    expect(calls).toEqual(['handler', 'listener'])
  })

  test('forkEvent of nothing gives the listener', () => {
    const listener = vi.fn()
    expect(Animated.forkEvent(null, listener)).toBe(listener)
  })

  test('forkEvent adds the listener to an Animated.Event, and unforkEvent removes it', () => {
    const value = new Animated.Value(0)
    const animatedEvent = new Animated.Event([{ nativeEvent: { y: value } }], {
      useNativeDriver: false,
    })
    const listener = vi.fn()
    const handler = animatedEvent.__getHandler()

    expect(Animated.forkEvent(animatedEvent, listener)).toBe(animatedEvent)
    handler({ nativeEvent: { y: 5 } })
    expect(value.__getValue()).toBe(5)
    expect(listener).toHaveBeenCalledOnce()

    Animated.unforkEvent(animatedEvent, listener)
    handler({ nativeEvent: { y: 6 } })
    expect(listener).toHaveBeenCalledOnce()
  })
})

describe('attachNativeEvent', () => {
  test('sets the values from the scroll of the element until detach', async () => {
    const offset = new Animated.Value(0)
    const ref = createRef<ScrollViewInstance>()
    const { container } = render(
      <Animated.ScrollView ref={ref} style={{ height: 100 }}>
        {tall}
      </Animated.ScrollView>,
    )
    const attached = Animated.attachNativeEvent(ref.current, 'onScroll', [
      { nativeEvent: { contentOffset: { y: offset } } },
    ])

    first(container).scrollTop = 30
    await waitFor(() => expect(offset.__getValue()).toBe(30))

    attached.detach()
    first(container).scrollTop = 70
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(offset.__getValue()).toBe(30)
  })

  test('warns once in development and does nothing for an event that is not onScroll', () => {
    resetWarnings()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const value = new Animated.Value(0)
    const { container } = render(<View />)

    const attached = Animated.attachNativeEvent(first(container), 'onLayout', [
      { nativeEvent: { layout: { width: value } } },
    ])

    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]?.[0]).toContain('attachNativeEvent supports only onScroll')
    attached.detach()
    warn.mockRestore()
  })

  test('throws when the mapping has no nativeEvent, as in React Native', () => {
    const value = new Animated.Value(0)
    expect(() => Animated.attachNativeEvent(null, 'onScroll', [{ y: value }])).toThrow(
      'Native driven events only support animated values contained inside `nativeEvent`.',
    )
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

  test('sets a ValueXY from an { x, y } in the event', () => {
    const offset = new Animated.ValueXY()
    const handler = Animated.event([{ nativeEvent: { contentOffset: offset } }], {
      useNativeDriver: false,
    })

    handler({ nativeEvent: { contentOffset: { x: 3, y: 4 } } })

    expect(offset.__getValue()).toEqual({ x: 3, y: 4 })
  })

  test('in development, throws when a ValueXY gets no { x, y }', () => {
    const offset = new Animated.ValueXY()
    const handler = Animated.event([{ nativeEvent: { offset } }], { useNativeDriver: false })
    expect(() => handler({ nativeEvent: { offset: 3 } })).toThrow(
      'Bad mapping of event key offset, should be XY but got 3',
    )
  })
})
