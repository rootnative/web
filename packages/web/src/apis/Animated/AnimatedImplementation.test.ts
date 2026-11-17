import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { installFakeMatchMedia } from '../../test/matchMedia'
import { Easing } from '../Easing'
import { parallel, spring, timing } from './AnimatedImplementation'
import { SpringAnimation } from './animations/SpringAnimation'
import { fromBouncinessAndSpeed, fromOrigamiTensionAndFriction } from './animations/springConfig'
import { AnimatedNode } from './nodes/AnimatedNode'
import { AnimatedValue } from './nodes/AnimatedValue'

type Sample = { time: number; value: number }

const record = (value: AnimatedValue): Sample[] => {
  const samples: Sample[] = []
  value.addListener(({ value: current }) =>
    samples.push({ time: performance.now(), value: current }),
  )
  return samples
}

const values = (samples: readonly Sample[]): number[] => samples.map((sample) => sample.value)

const isIncreasing = (list: readonly number[]): boolean =>
  list.every((item, i) => i === 0 || item > (list[i - 1] ?? -Infinity))

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'setTimeout',
      'clearTimeout',
      'performance',
    ],
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('timing', () => {
  test('moves to toValue over the duration on each frame, then ends with finished: true', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    const done = vi.fn()
    const startTime = performance.now()

    timing(value, {
      toValue: 100,
      duration: 100,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(done)
    expect(samples).toHaveLength(0)

    vi.advanceTimersByTime(90)
    expect(done).not.toHaveBeenCalled()
    for (const { time, value: current } of samples) expect(current).toBeCloseTo(time - startTime, 6)

    // The fake frames come every 16 ms, so the frame at 112 ms is the first past the duration.
    vi.advanceTimersByTime(20)
    expect(done).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10)
    expect(value.__getValue()).toBe(100)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
    expect(isIncreasing(values(samples))).toBe(true)
  })

  test('takes 500 ms with Easing.inOut(Easing.ease) by default, and useNativeDriver changes nothing', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    const done = vi.fn()
    const startTime = performance.now()
    const curve = Easing.inOut(Easing.ease)

    timing(value, { toValue: 1, useNativeDriver: true }).start(done)
    vi.advanceTimersByTime(490)
    expect(done).not.toHaveBeenCalled()
    for (const { time, value: current } of samples) {
      expect(current).toBeCloseTo(curve((time - startTime) / 500), 6)
    }

    vi.advanceTimersByTime(30)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
    expect(value.__getValue()).toBe(1)
  })

  test('a duration of 0 sets the value at once', () => {
    const value = new AnimatedValue(0)
    const done = vi.fn()
    timing(value, { toValue: 7, duration: 0, useNativeDriver: false }).start(done)
    expect(value.__getValue()).toBe(7)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })

  test('a delay waits before the first frame', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    timing(value, { toValue: 1, duration: 100, delay: 200, useNativeDriver: false }).start()
    vi.advanceTimersByTime(190)
    expect(samples).toHaveLength(0)
    vi.advanceTimersByTime(60)
    expect(samples.length).toBeGreaterThan(0)
  })

  test('stop ends it with finished: false and keeps the value where it was', () => {
    const value = new AnimatedValue(0)
    const done = vi.fn()
    const animation = timing(value, { toValue: 100, duration: 100, useNativeDriver: false })
    animation.start(done)
    vi.advanceTimersByTime(50)
    const stoppedAt = value.__getValue()

    animation.stop()
    vi.advanceTimersByTime(100)

    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
    expect(value.__getValue()).toBe(stoppedAt)
  })

  test('setValue stops it', () => {
    const value = new AnimatedValue(0)
    const done = vi.fn()
    timing(value, { toValue: 100, duration: 100, useNativeDriver: false }).start(done)
    vi.advanceTimersByTime(50)

    value.setValue(-5)
    vi.advanceTimersByTime(100)

    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
    expect(value.__getValue()).toBe(-5)
  })

  test('a new animation stops the one that runs and starts from the current value', () => {
    const value = new AnimatedValue(0)
    const first = vi.fn()
    const second = vi.fn()
    timing(value, {
      toValue: 100,
      duration: 100,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(first)
    vi.advanceTimersByTime(48)
    const from = value.__getValue()
    expect(from).toBeGreaterThan(0)

    const samples = record(value)
    timing(value, {
      toValue: 0,
      duration: 100,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(second)
    expect(first).toHaveBeenCalledExactlyOnceWith({ finished: false })
    vi.advanceTimersByTime(16)
    expect(samples[0]?.value).toBeLessThan(from)
    vi.advanceTimersByTime(100)
    expect(second).toHaveBeenCalledExactlyOnceWith({ finished: true })
    expect(value.__getValue()).toBe(0)
  })

  test('calls onComplete of the config, then the callback of start', () => {
    const value = new AnimatedValue(0)
    const calls: string[] = []
    timing(value, {
      toValue: 1,
      duration: 0,
      useNativeDriver: false,
      onComplete: () => calls.push('onComplete'),
    }).start(() => calls.push('start'))
    expect(calls).toEqual(['onComplete', 'start'])
  })

  test('throws for a toValue that is not a number', () => {
    const value = new AnimatedValue(0)
    const toValue = new AnimatedValue(1) as unknown as number
    expect(() => timing(value, { toValue, useNativeDriver: false }).start()).toThrow(
      'Animated: a toValue that is not a number is not in @rootnative/web yet',
    )
  })
})

describe('stopAnimation and resetAnimation', () => {
  test('stopAnimation gives the current value to its callback', () => {
    const value = new AnimatedValue(0)
    const done = vi.fn()
    timing(value, { toValue: 100, duration: 100, useNativeDriver: false }).start(done)
    vi.advanceTimersByTime(50)
    const current = value.__getValue()
    const callback = vi.fn()

    value.stopAnimation(callback)

    expect(callback).toHaveBeenCalledExactlyOnceWith(current)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
  })

  test('resetAnimation and reset() go back to the first value and update nothing', () => {
    const value = new AnimatedValue(10)
    const animation = timing(value, { toValue: 100, duration: 0, useNativeDriver: false })
    animation.start()
    expect(value.__getValue()).toBe(100)
    const listener = vi.fn()
    value.addListener(listener)

    animation.reset()
    expect(value.__getValue()).toBe(10)

    value.setValue(50)
    value.resetAnimation()
    expect(value.__getValue()).toBe(10)
    expect(listener).toHaveBeenCalledExactlyOnceWith({ value: 50 })
  })

  test('a value that leaves the graph stops its animation', () => {
    const value = new AnimatedValue(0)
    const leaf = Object.assign(new AnimatedNode(), { update: vi.fn() })
    value.__addChild(leaf)
    const done = vi.fn()
    timing(value, { toValue: 100, duration: 100, useNativeDriver: false }).start(done)
    vi.advanceTimersByTime(32)
    expect(leaf.update).toHaveBeenCalled()

    value.__removeChild(leaf)

    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
  })
})

describe('spring', () => {
  test('settles at toValue and moves past it once on the way, by default', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    const done = vi.fn()

    spring(value, { toValue: 100, useNativeDriver: false }).start(done)
    vi.advanceTimersByTime(5000)

    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
    expect(value.__getValue()).toBe(100)
    expect(Math.max(...values(samples))).toBeGreaterThan(100)
  })

  // As in React Native, the frame that passes toValue sets that value, and then the same frame
  // sets toValue. The browser paints only the second.
  test('overshootClamping ends it on the frame that reaches toValue', () => {
    const clamped = new AnimatedValue(0)
    const free = new AnimatedValue(0)
    const clampedDone = vi.fn()
    const freeDone = vi.fn()

    spring(clamped, { toValue: 100, overshootClamping: true, useNativeDriver: false }).start(
      clampedDone,
    )
    spring(free, { toValue: 100, useNativeDriver: false }).start(freeDone)
    vi.advanceTimersByTime(400)

    expect(clampedDone).toHaveBeenCalledExactlyOnceWith({ finished: true })
    expect(clamped.__getValue()).toBe(100)
    expect(freeDone).not.toHaveBeenCalled()
  })

  test('a spring from stiffness, damping, and mass with ζ ≥ 1 never moves past toValue', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    const done = vi.fn()

    spring(value, {
      toValue: 1,
      stiffness: 1000,
      damping: 500,
      mass: 1,
      useNativeDriver: false,
    }).start(done)
    vi.advanceTimersByTime(5000)

    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
    expect(isIncreasing(values(samples))).toBe(true)
    expect(value.__getValue()).toBe(1)
  })

  test('velocity moves the value before the spring pulls it back', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    spring(value, { toValue: 0, velocity: 100, useNativeDriver: false }).start()
    vi.advanceTimersByTime(16)
    expect(samples[0]?.value).toBe(0)
    expect(samples[1]?.value).toBeGreaterThan(0)
  })

  test('a spring that takes over from a spring keeps its speed', () => {
    const value = new AnimatedValue(0)
    const first = vi.fn()
    spring(value, { toValue: 100, useNativeDriver: false }).start(first)
    vi.advanceTimersByTime(48)
    const at = value.__getValue()

    const samples = record(value)
    spring(value, { toValue: 0, useNativeDriver: false }).start()
    vi.advanceTimersByTime(16)

    expect(first).toHaveBeenCalledExactlyOnceWith({ finished: false })
    expect(samples.at(-1)?.value).toBeGreaterThan(at)
  })

  test('the presets of React Native', () => {
    expect(fromOrigamiTensionAndFriction(40, 7)).toEqual({ stiffness: 230.2, damping: 22 })
    const bouncy = fromBouncinessAndSpeed(8, 12)
    expect(bouncy.stiffness).toBeCloseTo(342.1005882, 6)
    expect(bouncy.damping).toBeCloseTo(24.6840192, 6)
  })

  test.each([
    { stiffness: 100, bounciness: 8 },
    { damping: 10, tension: 40 },
    { bounciness: 8, friction: 7 },
  ])('throws for two kinds of config: %o', (config) => {
    expect(() => new SpringAnimation({ toValue: 1, useNativeDriver: false, ...config })).toThrow(
      'You can define one of bounciness/speed, tension/friction, or stiffness/damping/mass, but not more than one',
    )
  })

  test.each([
    [{ stiffness: 0 }, 'Stiffness value must be greater than 0'],
    [{ damping: 0 }, 'Damping value must be greater than 0'],
    [{ mass: 0 }, 'Mass value must be greater than 0'],
  ])('throws for %o', (config, message) => {
    expect(() => new SpringAnimation({ toValue: 1, useNativeDriver: false, ...config })).toThrow(
      message,
    )
  })
})

describe('with reduced motion', () => {
  let media: ReturnType<typeof installFakeMatchMedia>

  beforeEach(() => {
    media = installFakeMatchMedia()
    media.get('(prefers-reduced-motion: reduce)').set(true)
  })

  afterEach(() => {
    media.restore()
  })

  test('timing goes to toValue at once, after its delay', () => {
    const value = new AnimatedValue(0)
    const done = vi.fn()
    timing(value, { toValue: 1, duration: 300, delay: 100, useNativeDriver: false }).start(done)
    vi.advanceTimersByTime(90)
    expect(value.__getValue()).toBe(0)

    vi.advanceTimersByTime(10)
    expect(value.__getValue()).toBe(1)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })

  test('spring goes to toValue at once', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    const done = vi.fn()
    spring(value, { toValue: 1, useNativeDriver: false }).start(done)
    expect(values(samples)).toEqual([1])
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })
})

const run = (value: AnimatedValue, duration: number) =>
  timing(value, { toValue: 100, duration, useNativeDriver: false })

describe('parallel', () => {
  test('starts each animation and calls back once, when the last one ends', () => {
    const a = new AnimatedValue(0)
    const b = new AnimatedValue(0)
    const done = vi.fn()
    parallel([run(a, 100), run(b, 200)]).start(done)

    vi.advanceTimersByTime(150)
    expect(a.__getValue()).toBe(100)
    expect(b.__getValue()).toBeLessThan(100)
    expect(done).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })

  test('one animation that stops early stops the rest', () => {
    const a = new AnimatedValue(0)
    const b = new AnimatedValue(0)
    const done = vi.fn()
    parallel([run(a, 100), run(b, 100)]).start(done)
    vi.advanceTimersByTime(50)
    const bAt = b.__getValue()

    a.setValue(5)
    vi.advanceTimersByTime(100)

    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
    expect(b.__getValue()).toBe(bAt)
  })

  test('with stopTogether: false, the others go on', () => {
    const a = new AnimatedValue(0)
    const b = new AnimatedValue(0)
    const done = vi.fn()
    parallel([run(a, 100), run(b, 100)], { stopTogether: false }).start(done)
    vi.advanceTimersByTime(50)

    a.setValue(5)
    expect(done).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)

    expect(b.__getValue()).toBe(100)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })

  test('stop stops each animation, and reset sets each value back', () => {
    const a = new AnimatedValue(0)
    const b = new AnimatedValue(0)
    const done = vi.fn()
    const both = parallel([run(a, 100), run(b, 100)])
    both.start(done)
    vi.advanceTimersByTime(50)

    both.stop()
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })

    both.reset()
    expect([a.__getValue(), b.__getValue()]).toEqual([0, 0])
  })

  test('an empty list ends at once', () => {
    const done = vi.fn()
    parallel([]).start(done)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })
})
