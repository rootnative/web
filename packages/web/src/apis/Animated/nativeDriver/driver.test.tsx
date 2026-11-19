import { act, type ReactNode } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { View, type ViewProps } from '../../../components/View'
import { installFakeMatchMedia } from '../../../test/matchMedia'
import { cleanup, render } from '../../../test/render'
import { Easing } from '../../Easing'
import * as Animated from '../AnimatedExports'

afterEach(cleanup)

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()))

const frames = (count: number): Promise<void> =>
  count === 0 ? Promise.resolve() : nextFrame().then(() => frames(count - 1))

// A microtask runs the detach of a node that a render dropped.
const flushDetach = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve))

const byTestId = (container: HTMLElement, id: string): HTMLElement =>
  container.querySelector(`[data-testid="${id}"]`) as HTMLElement

const tracksOf = (element: HTMLElement): Animation[] => element.getAnimations()

const keyframesOf = (element: HTMLElement): ComputedKeyframe[] => {
  const effect = tracksOf(element)[0]?.effect
  if (!(effect instanceof KeyframeEffect)) throw new Error('no keyframes')
  return effect.getKeyframes()
}

type Config = { useNativeDriver: boolean; duration?: number; delay?: number }

const linear = (
  value: Animated.Value,
  toValue: number,
  config: Config,
): Animated.CompositeAnimation =>
  Animated.timing(value, { toValue, easing: Easing.linear, duration: 150, ...config })

// A box whose opacity and translateX follow `value`.
const Box = ({ value, id = 'box' }: { value: Animated.Value; id?: string }): ReactNode => (
  <Animated.View
    testID={id}
    style={{
      opacity: value,
      transform: [{ translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, 100] }) }],
    }}
  />
)

// A box with a static rotation, and an interpolation that each render makes again.
const Spinner = ({ value, rotate }: { value: Animated.Value; rotate: string }): ReactNode => (
  <Animated.View
    testID="box"
    style={{
      transform: [
        { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, 100] }) },
        { rotate },
      ],
    }}
  />
)

// A component that ignores its ref, so driver A renders it on each frame.
const Plain = ({ style }: ViewProps): ReactNode => <View testID="box" style={style} />
const AnimatedPlain = Animated.createAnimatedComponent(Plain)

const renderBox = (value: Animated.Value): HTMLElement =>
  byTestId(render(<Box value={value} />).container, 'box')

describe('a timing or spring with useNativeDriver: true', () => {
  test('plays a Web Animation, writes no style on a frame, and writes the end value', async () => {
    const value = new Animated.Value(0)
    const box = renderBox(value)
    const style = box.getAttribute('style')
    const done = vi.fn()

    linear(value, 1, { useNativeDriver: true, duration: 600 }).start(done)
    expect(tracksOf(box)).toHaveLength(1)
    await frames(3)
    expect(box.getAttribute('style')).toBe(style)

    await vi.waitFor(() => expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true }), {
      timeout: 3000,
    })
    expect(tracksOf(box)).toHaveLength(0)
    expect(value.__getValue()).toBe(1)
    expect(box.style.opacity).toBe('1')
    expect(box.style.transform).toBe('translateX(100px)')
  })

  // Firefox gives the time of its last refresh tick, which is old after an idle time. The next
  // tick gives the time of now.
  test('an old time of the document timeline does not end the run early', async () => {
    const value = new Animated.Value(0)
    const box = renderBox(value)
    const done = vi.fn()
    let old: number | null = performance.now() - 10_000
    Object.defineProperty(document.timeline, 'currentTime', {
      configurable: true,
      get: () => old ?? performance.now(),
    })
    try {
      linear(value, 1, { useNativeDriver: true, duration: 2000 }).start(done)
      old = null
      await frames(2)

      expect(done).not.toHaveBeenCalled()
      expect(tracksOf(box)).toHaveLength(1)
      expect(value.__getValue()).toBeLessThan(0.5)
    } finally {
      Reflect.deleteProperty(document.timeline, 'currentTime')
      value.stopAnimation()
    }
  })

  test('with useNativeDriver: false, writes the style on each frame, as before', async () => {
    const value = new Animated.Value(0)
    const box = renderBox(value)

    linear(value, 1, { useNativeDriver: false, duration: 5000 }).start()
    await frames(3)

    expect(tracksOf(box)).toHaveLength(0)
    expect(Number(box.style.opacity)).toBeGreaterThan(0)
    value.stopAnimation()
  })

  test.each([
    [
      'timing',
      (value: Animated.Value, useNativeDriver: boolean) => linear(value, 1, { useNativeDriver }),
    ],
    [
      'spring',
      (value: Animated.Value, useNativeDriver: boolean) =>
        Animated.spring(value, { toValue: 1, stiffness: 300, damping: 30, useNativeDriver }),
    ],
  ])('a %s gives the end value, end callback, and listener calls of driver A', async (_, make) => {
    const results = await Promise.all(
      [false, true].map(async (useNativeDriver) => {
        const value = new Animated.Value(0)
        render(<Box value={value} id={`box-${useNativeDriver}`} />)
        const heard: number[] = []
        value.addListener(({ value: current }) => heard.push(current))
        const done = vi.fn()
        make(value, useNativeDriver).start(done)
        await vi.waitFor(() => expect(done).toHaveBeenCalled(), { timeout: 3000 })
        return { done: done.mock.calls, end: value.__getValue(), heard }
      }),
    )

    for (const { done, end, heard } of results) {
      expect(done).toEqual([[{ finished: true }]])
      expect(end).toBe(1)
      expect(heard.length).toBeGreaterThan(3)
      expect(heard.at(-1)).toBe(1)
    }
  })

  test('the value reads the current frame during the run', async () => {
    const value = new Animated.Value(0)
    renderBox(value)

    linear(value, 1, { useNativeDriver: true, duration: 5000 }).start()
    await frames(2)
    const early = value.__getValue()
    await frames(3)

    expect(early).toBeGreaterThan(0)
    expect(value.__getValue()).toBeGreaterThan(early)
    expect(value.__getValue()).toBeLessThan(1)
    value.stopAnimation()
  })

  test('stop writes the value of the current frame and ends with finished: false', async () => {
    const value = new Animated.Value(0)
    const box = renderBox(value)
    const done = vi.fn()

    linear(value, 1, { useNativeDriver: true, duration: 5000 }).start(done)
    await frames(3)
    let stoppedAt = -1
    value.stopAnimation((current) => {
      stoppedAt = current
    })

    expect(stoppedAt).toBeGreaterThan(0)
    expect(stoppedAt).toBeLessThan(1)
    expect(tracksOf(box)).toHaveLength(0)
    expect(Number(box.style.opacity)).toBeCloseTo(stoppedAt, 6)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
  })

  test('setValue stops the run', async () => {
    const value = new Animated.Value(0)
    const box = renderBox(value)
    const done = vi.fn()

    linear(value, 1, { useNativeDriver: true, duration: 5000 }).start(done)
    await frames(2)
    value.setValue(0.25)

    expect(tracksOf(box)).toHaveLength(0)
    expect(value.__getValue()).toBe(0.25)
    expect(box.style.opacity).toBe('0.25')
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
  })

  test('a spring that takes over from a spring goes on in the same direction', async () => {
    const value = new Animated.Value(0)
    renderBox(value)

    Animated.spring(value, { toValue: 1, useNativeDriver: true }).start()
    await frames(3)
    // A soft spring, so the value turns back only after about 0.5 s.
    Animated.spring(value, { toValue: 0, stiffness: 10, damping: 2, useNativeDriver: true }).start()
    const atTakeover = value.__getValue()
    await frames(2)

    expect(value.__getValue()).toBeGreaterThan(atTakeover)
    value.stopAnimation()
  })

  test('starts after the delay', async () => {
    const value = new Animated.Value(0)
    const box = renderBox(value)

    linear(value, 1, { useNativeDriver: true, delay: 100, duration: 5000 }).start()
    expect(tracksOf(box)).toHaveLength(0)

    await vi.waitFor(() => expect(tracksOf(box)).toHaveLength(1))
    value.stopAnimation()
  })

  test('calls the listeners on each frame, also a listener added during the run', async () => {
    const value = new Animated.Value(0)
    renderBox(value)

    linear(value, 1, { useNativeDriver: true, duration: 5000 }).start()
    await frames(2)
    const heard: number[] = []
    value.addListener(({ value: current }) => heard.push(current))
    await frames(4)

    expect(heard.length).toBeGreaterThanOrEqual(3)
    expect(heard.every((current, i) => i === 0 || current > (heard[i - 1] ?? 0))).toBe(true)
    value.stopAnimation()
  })

  test('an unmount stops the run with finished: false', async () => {
    const value = new Animated.Value(0)
    const { container, unmount } = render(<Box value={value} />)
    const box = byTestId(container, 'box')
    const done = vi.fn()

    linear(value, 1, { useNativeDriver: true, duration: 5000 }).start(done)
    unmount()
    await flushDetach()

    expect(tracksOf(box)).toHaveLength(0)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
  })
})

describe('a render during the run', () => {
  test('builds the track again with the new static style, also with a new interpolation', async () => {
    const value = new Animated.Value(0)
    const { container, rerender } = render(<Spinner value={value} rotate="10deg" />)
    const box = byTestId(container, 'box')

    linear(value, 1, { useNativeDriver: true, duration: 5000 }).start()
    await frames(2)
    rerender(<Spinner value={value} rotate="20deg" />)
    await flushDetach()

    expect(tracksOf(box)).toHaveLength(1)
    const keyframes = keyframesOf(box)
    expect(String(keyframes[0]?.['transform'])).toContain('rotate(20deg)')
    expect(Number.parseFloat(String(keyframes[0]?.['transform']).slice(11))).toBeGreaterThan(0)
    value.stopAnimation()
  })
})

describe('the frame loop of driver A takes over', () => {
  test('when a value on driver A changes the same element', async () => {
    const value = new Animated.Value(0)
    const other = new Animated.Value(0)
    const { container } = render(
      <Animated.View testID="box" style={{ opacity: value, transform: [{ translateX: other }] }} />,
    )
    const box = byTestId(container, 'box')
    const done = vi.fn()

    linear(value, 1, { useNativeDriver: true, duration: 300 }).start(done)
    expect(tracksOf(box)).toHaveLength(1)
    await frames(2)
    other.setValue(10)

    expect(tracksOf(box)).toHaveLength(0)
    expect(Number(box.style.opacity)).toBeGreaterThan(0)
    const opacity = box.style.opacity
    await frames(2)
    expect(box.style.opacity).not.toBe(opacity)
    await vi.waitFor(() => expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true }))
    expect(box.style.opacity).toBe('1')
  })

  test('for a style key other than transform and opacity', async () => {
    const value = new Animated.Value(0)
    const { container } = render(<Animated.View testID="box" style={{ width: value }} />)
    const box = byTestId(container, 'box')
    const done = vi.fn()

    Animated.timing(value, { toValue: 50, duration: 100, useNativeDriver: true }).start(done)
    expect(tracksOf(box)).toHaveLength(0)

    await vi.waitFor(() => expect(done).toHaveBeenCalled())
    expect(box.style.width).toBe('50px')
  })

  test('for a diffClamp on the way', () => {
    const value = new Animated.Value(0)
    const { container } = render(
      <Animated.View testID="box" style={{ opacity: Animated.diffClamp(value, 0, 1) }} />,
    )

    linear(value, 1, { useNativeDriver: true, duration: 5000 }).start()
    expect(tracksOf(byTestId(container, 'box'))).toHaveLength(0)
    value.stopAnimation()
  })

  test('for a component that ignores its ref', () => {
    const value = new Animated.Value(0)
    const { container } = render(<AnimatedPlain style={{ opacity: value }} />)

    act(() => linear(value, 1, { useNativeDriver: true }).start())
    expect(tracksOf(byTestId(container, 'box'))).toHaveLength(0)
    act(() => value.stopAnimation())
  })

  test('above the budget of 3,000 samples: 50 elements for 1 s, not 49', () => {
    const counts = [49, 50].map((count) => {
      const value = new Animated.Value(0)
      const { container } = render(
        <View>
          {Array.from({ length: count }, (_, i) => (
            <Box key={i} value={value} id={`box-${count}-${i}`} />
          ))}
        </View>,
      )
      linear(value, 1, { useNativeDriver: true, duration: 1000 }).start()
      const tracks = container.querySelectorAll<HTMLElement>('[data-testid]')
      const playing = [...tracks].filter((box) => tracksOf(box).length > 0).length
      value.stopAnimation()
      return playing
    })

    expect(counts).toEqual([49, 0])
  })

  test('with reduced motion, which goes to the end at once', () => {
    const media = installFakeMatchMedia()
    media.get('(prefers-reduced-motion: reduce)').set(true)
    try {
      const value = new Animated.Value(0)
      const box = renderBox(value)
      const done = vi.fn()

      linear(value, 1, { useNativeDriver: true }).start(done)

      expect(tracksOf(box)).toHaveLength(0)
      expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
      expect(value.__getValue()).toBe(1)
    } finally {
      media.restore()
    }
  })
})

// A box whose opacity follows `fade` and whose translateX follows `move`.
const FadeAndMove = ({ fade, move }: { fade: Animated.Value; move: Animated.Value }): ReactNode => (
  <Animated.View testID="box" style={{ opacity: fade, transform: [{ translateX: move }] }} />
)

const lastKeyframe = (element: HTMLElement): ComputedKeyframe | undefined =>
  keyframesOf(element).at(-1)

describe('more than one value on one element', () => {
  test('the x and y of a ValueXY share one track', async () => {
    const xy = new Animated.ValueXY({ x: 0, y: 0 })
    const { container } = render(
      <Animated.View testID="box" style={{ transform: xy.getTranslateTransform() }} />,
    )
    const box = byTestId(container, 'box')
    const done = vi.fn()

    Animated.spring(xy, {
      toValue: { x: 100, y: 50 },
      stiffness: 300,
      damping: 30,
      useNativeDriver: true,
    }).start(done)

    expect(tracksOf(box)).toHaveLength(1)
    expect(lastKeyframe(box)?.['transform']).toBe('translateX(100px) translateY(50px)')
    await vi.waitFor(() => expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true }), {
      timeout: 3000,
    })
    expect(tracksOf(box)).toHaveLength(0)
    expect(box.style.transform).toBe('translateX(100px) translateY(50px)')
  })

  test('a run that ends first keeps its end value, and the other goes on', async () => {
    const fade = new Animated.Value(0)
    const move = new Animated.Value(0)
    const box = byTestId(render(<FadeAndMove fade={fade} move={move} />).container, 'box')
    const faded = vi.fn()
    const moved = vi.fn()

    Animated.parallel([
      linear(fade, 1, { useNativeDriver: true, duration: 150 }),
      linear(move, 100, { useNativeDriver: true, duration: 1500 }),
    ]).start(moved)
    fade.addListener(({ value }) => {
      if (value === 1) faded()
    })

    expect(tracksOf(box)).toHaveLength(1)
    expect(lastKeyframe(box)).toMatchObject({ opacity: '1', transform: 'translateX(100px)' })
    await vi.waitFor(() => expect(faded).toHaveBeenCalled(), { timeout: 3000 })

    // The ended run left the track, and the inline style holds its value.
    expect(tracksOf(box)).toHaveLength(1)
    expect(keyframesOf(box).some((keyframe) => 'opacity' in keyframe)).toBe(false)
    expect(box.style.opacity).toBe('1')
    await vi.waitFor(() => expect(moved).toHaveBeenCalledExactlyOnceWith({ finished: true }), {
      timeout: 3000,
    })
    expect(tracksOf(box)).toHaveLength(0)
    expect(box.style.transform).toBe('translateX(100px)')
  })

  test('a stop of one run keeps the other on its Web Animation', async () => {
    const fade = new Animated.Value(0)
    const move = new Animated.Value(0)
    const box = byTestId(render(<FadeAndMove fade={fade} move={move} />).container, 'box')

    linear(fade, 1, { useNativeDriver: true, duration: 5000 }).start()
    linear(move, 100, { useNativeDriver: true, duration: 5000 }).start()
    await frames(2)
    let stoppedAt = -1
    fade.stopAnimation((value) => {
      stoppedAt = value
    })

    expect(tracksOf(box)).toHaveLength(1)
    expect(keyframesOf(box).some((keyframe) => 'opacity' in keyframe)).toBe(false)
    expect(Number(box.style.opacity)).toBeCloseTo(stoppedAt, 6)
    const before = move.__getValue()
    await frames(2)
    expect(move.__getValue()).toBeGreaterThan(before)
    move.stopAnimation()
  })

  test('a setValue of one value moves the other to the frame loop', async () => {
    const fade = new Animated.Value(0)
    const move = new Animated.Value(0)
    const box = byTestId(render(<FadeAndMove fade={fade} move={move} />).container, 'box')

    linear(fade, 1, { useNativeDriver: true, duration: 5000 }).start()
    linear(move, 100, { useNativeDriver: true, duration: 5000 }).start()
    await frames(2)
    fade.setValue(0.5)

    expect(tracksOf(box)).toHaveLength(0)
    const transform = box.style.transform
    await frames(2)
    expect(box.style.transform).not.toBe(transform)
    move.stopAnimation()
  })
})

describe('the composites', () => {
  test('a sequence runs each step on a Web Animation', async () => {
    const value = new Animated.Value(0)
    const box = renderBox(value)
    const done = vi.fn()
    const steps: number[] = []

    Animated.sequence([
      linear(value, 1, { useNativeDriver: true, duration: 150 }),
      linear(value, 0.5, { useNativeDriver: true, duration: 150 }),
    ]).start(done)
    value.addListener(() => steps.push(tracksOf(box).length))

    await vi.waitFor(() => expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true }), {
      timeout: 3000,
    })
    expect(steps).toContain(1)
    expect(tracksOf(box)).toHaveLength(0)
    expect(value.__getValue()).toBe(0.5)
    expect(box.style.opacity).toBe('0.5')
  })

  test('a loop runs each round on a Web Animation', async () => {
    const value = new Animated.Value(0)
    const box = renderBox(value)
    const done = vi.fn()

    Animated.loop(linear(value, 1, { useNativeDriver: true, duration: 150 }), {
      iterations: 2,
    }).start(done)
    expect(tracksOf(box)).toHaveLength(1)

    await vi.waitFor(() => expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true }), {
      timeout: 3000,
    })
    expect(tracksOf(box)).toHaveLength(0)
    expect(value.__getValue()).toBe(1)
  })

  test('a stagger starts each element on its own Web Animation', async () => {
    const first = new Animated.Value(0)
    const second = new Animated.Value(0)
    const { container } = render(
      <View>
        <Box value={first} id="first" />
        <Box value={second} id="second" />
      </View>,
    )

    Animated.stagger(50, [
      linear(first, 1, { useNativeDriver: true, duration: 5000 }),
      linear(second, 1, { useNativeDriver: true, duration: 5000 }),
    ]).start()

    expect(tracksOf(byTestId(container, 'first'))).toHaveLength(1)
    await vi.waitFor(() => expect(tracksOf(byTestId(container, 'second'))).toHaveLength(1))
    first.stopAnimation()
    second.stopAnimation()
  })
})
