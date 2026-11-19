import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { installFakeMatchMedia } from '../../test/matchMedia'
import { Easing } from '../Easing'
import {
  decay,
  delay,
  loop,
  parallel,
  sequence,
  spring,
  stagger,
  timing,
} from './AnimatedImplementation'
import { SpringAnimation } from './animations/SpringAnimation'
import { fromBouncinessAndSpeed, fromOrigamiTensionAndFriction } from './animations/springConfig'
import { AnimatedColor } from './nodes/AnimatedColor'
import { AnimatedNode } from './nodes/AnimatedNode'
import { AnimatedValue } from './nodes/AnimatedValue'
import { AnimatedValueXY } from './nodes/AnimatedValueXY'

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

  test('throws for a toValue that is not a number or a node, such as a color string', () => {
    const value = new AnimatedValue(0)
    const toValue = 'red' as unknown as number
    expect(() => timing(value, { toValue, useNativeDriver: false }).start()).toThrow(
      'Animated: toValue must be a number or an Animated node.',
    )
    expect(() => spring(value, { toValue, useNativeDriver: false }).start()).toThrow(
      'Animated: toValue must be a number or an Animated node.',
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

  test('decay goes at once to the value where the motion comes to rest', () => {
    const value = new AnimatedValue(10)
    const samples = record(value)
    const done = vi.fn()
    decay(value, { velocity: 1, deceleration: 0.99, useNativeDriver: false }).start(done)
    expect(samples).toHaveLength(1)
    expect(value.__getValue()).toBeCloseTo(110, 6)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })

  test('an endless loop ends after one iteration', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    const done = vi.fn()
    loop(timing(value, { toValue: 1, duration: 300, useNativeDriver: false })).start(done)
    expect(values(samples)).toEqual([1])
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })

  test('a loop with a delay in it ends after one iteration too', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    const done = vi.fn()
    loop(sequence([delay(100), timing(value, { toValue: 1, useNativeDriver: false })])).start(done)
    vi.advanceTimersByTime(500)
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

describe('decay', () => {
  test('slows from velocity by deceleration each millisecond, and ends on a frame that moves less than 0.1', () => {
    const value = new AnimatedValue(10)
    const samples = record(value)
    const done = vi.fn()
    const startTime = performance.now()
    decay(value, { velocity: 1, deceleration: 0.99, useNativeDriver: false }).start(done)

    vi.advanceTimersByTime(2000)

    for (const { time, value: current } of samples) {
      expect(current).toBeCloseTo(10 + 100 * (1 - Math.exp(-0.01 * (time - startTime))), 6)
    }
    const list = [10, ...values(samples)]
    const steps = list.slice(1).map((current, i) => current - (list[i] ?? 0))
    expect(steps.at(-1)).toBeLessThan(0.1)
    expect(steps.slice(0, -1).every((step) => step >= 0.1)).toBe(true)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })

  test('uses a deceleration of 0.998 by default', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    const startTime = performance.now()
    decay(value, { velocity: -0.5, useNativeDriver: false }).start()
    vi.advanceTimersByTime(100)

    expect(samples.length).toBeGreaterThan(0)
    for (const { time, value: current } of samples) {
      expect(current).toBeCloseTo(-250 * (1 - Math.exp(-0.002 * (time - startTime))), 6)
    }
  })

  test('stop ends it with finished: false where it is', () => {
    const value = new AnimatedValue(0)
    const done = vi.fn()
    const animation = decay(value, { velocity: 1, useNativeDriver: false })
    animation.start(done)
    vi.advanceTimersByTime(50)
    const at = value.__getValue()

    animation.stop()
    vi.advanceTimersByTime(100)

    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
    expect(value.__getValue()).toBe(at)
  })
})

describe('sequence', () => {
  test('starts each animation when the one before it ends', () => {
    const a = new AnimatedValue(0)
    const b = new AnimatedValue(0)
    const done = vi.fn()
    sequence([run(a, 100), run(b, 100)]).start(done)

    vi.advanceTimersByTime(120)
    expect(a.__getValue()).toBe(100)
    expect(b.__getValue()).toBe(0)
    expect(done).not.toHaveBeenCalled()

    vi.advanceTimersByTime(120)
    expect(b.__getValue()).toBe(100)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })

  test('one that stops early ends the sequence, and the next ones do not start', () => {
    const a = new AnimatedValue(0)
    const b = new AnimatedValue(0)
    const done = vi.fn()
    const both = sequence([run(a, 100), run(b, 100)])
    both.start(done)
    vi.advanceTimersByTime(50)

    both.stop()
    vi.advanceTimersByTime(300)

    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
    expect(b.__getValue()).toBe(0)
  })

  test('reset sets back each animation up to the current one', () => {
    const a = new AnimatedValue(0)
    const b = new AnimatedValue(0)
    const both = sequence([run(a, 100), run(b, 100)])
    both.start()
    vi.advanceTimersByTime(150)
    expect(b.__getValue()).toBeGreaterThan(0)

    both.reset()

    expect([a.__getValue(), b.__getValue()]).toEqual([0, 0])
  })

  test('a new start after the end begins at the first animation', () => {
    const a = new AnimatedValue(0)
    const b = new AnimatedValue(0)
    const both = sequence([run(a, 100), run(b, 100)])
    both.start()
    vi.advanceTimersByTime(300)
    a.setValue(0)
    b.setValue(0)

    both.start()
    vi.advanceTimersByTime(50)

    expect(a.__getValue()).toBeGreaterThan(0)
    expect(b.__getValue()).toBe(0)
  })

  test('an empty list ends at once', () => {
    const done = vi.fn()
    sequence([]).start(done)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })
})

describe('delay and stagger', () => {
  test('delay ends after the time, with finished: true', () => {
    const done = vi.fn()
    delay(100).start(done)
    vi.advanceTimersByTime(99)
    expect(done).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })

  test('stagger starts animation i after time * i milliseconds', () => {
    const [a, b, c] = [new AnimatedValue(0), new AnimatedValue(0), new AnimatedValue(0)]
    const done = vi.fn()
    stagger(50, [run(a, 100), run(b, 100), run(c, 100)]).start(done)

    vi.advanceTimersByTime(49)
    expect([a.__getValue() > 0, b.__getValue(), c.__getValue()]).toEqual([true, 0, 0])

    vi.advanceTimersByTime(50)
    expect([b.__getValue() > 0, c.__getValue()]).toEqual([true, 0])

    vi.advanceTimersByTime(200)
    expect([a.__getValue(), b.__getValue(), c.__getValue()]).toEqual([100, 100, 100])
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })
})

describe('loop', () => {
  test('runs the animation again from the start until stop()', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    const done = vi.fn()
    const looped = loop(run(value, 100))
    looped.start(done)

    // The iterations end on the frames at 112, 224, and 336 ms.
    vi.advanceTimersByTime(350)
    expect(values(samples).filter((current) => current === 100)).toHaveLength(3)
    expect(done).not.toHaveBeenCalled()

    looped.stop()
    vi.advanceTimersByTime(200)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
    expect(values(samples).filter((current) => current === 100)).toHaveLength(3)
  })

  test('with iterations, runs that many times, then ends with finished: true', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    const done = vi.fn()
    loop(run(value, 100), { iterations: 2 }).start(done)

    vi.advanceTimersByTime(500)

    expect(values(samples).filter((current) => current === 100)).toHaveLength(2)
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })

  test('with resetBeforeIteration: false, the next iteration starts where the last one ended', () => {
    const value = new AnimatedValue(0)
    const samples = record(value)
    loop(run(value, 100), { iterations: 2, resetBeforeIteration: false }).start()

    vi.advanceTimersByTime(500)

    const list = values(samples)
    expect(list.slice(list.indexOf(100)).every((current) => current === 100)).toBe(true)
  })

  test('with iterations: 0, ends at once and runs nothing', () => {
    const value = new AnimatedValue(0)
    const done = vi.fn()
    loop(run(value, 100), { iterations: 0 }).start(done)
    vi.advanceTimersByTime(200)

    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
    expect(value.__getValue()).toBe(0)
  })
})

const follow = (follower: AnimatedValue, leader: AnimatedValue) =>
  timing(follower, {
    toValue: leader,
    duration: 100,
    easing: Easing.linear,
    useNativeDriver: false,
  })

describe('a node as toValue', () => {
  test('the value follows the node: each change starts a new animation to it', () => {
    const leader = new AnimatedValue(0)
    const follower = new AnimatedValue(0)
    const done = vi.fn()
    follow(follower, leader).start(done)
    vi.advanceTimersByTime(200)

    leader.setValue(50)
    vi.advanceTimersByTime(50)
    const halfway = follower.__getValue()
    expect(halfway).toBeGreaterThan(0)
    expect(halfway).toBeLessThan(50)

    leader.setValue(80)
    expect(done).toHaveBeenLastCalledWith({ finished: false })
    vi.advanceTimersByTime(200)

    expect(follower.__getValue()).toBeCloseTo(80, 6)
    expect(done).toHaveBeenLastCalledWith({ finished: true })
  })

  test('a spring follows the output of an interpolation', () => {
    const leader = new AnimatedValue(0)
    const follower = new AnimatedValue(0)
    spring(follower, {
      toValue: leader.interpolate({ inputRange: [0, 1], outputRange: [0, 100] }),
      useNativeDriver: false,
    }).start()

    leader.setValue(1)
    vi.advanceTimersByTime(3000)

    expect(follower.__getValue()).toBeCloseTo(100, 2)
  })

  test('stopAnimation and a new animation of the value end the tracking', () => {
    const leader = new AnimatedValue(0)
    const follower = new AnimatedValue(0)
    follow(follower, leader).start()
    follower.stopAnimation()
    expect(leader.__getChildren()).toHaveLength(0)

    follow(follower, leader).start()
    timing(follower, { toValue: 10, duration: 100, useNativeDriver: false }).start()
    expect(leader.__getChildren()).toHaveLength(0)

    leader.setValue(50)
    vi.advanceTimersByTime(200)
    expect(follower.__getValue()).toBe(10)
  })

  test('setValue of the value does not end the tracking, as in React Native', () => {
    const leader = new AnimatedValue(0)
    const follower = new AnimatedValue(0)
    follow(follower, leader).start()

    follower.setValue(5)
    leader.setValue(50)
    vi.advanceTimersByTime(200)

    expect(follower.__getValue()).toBeCloseTo(50, 6)
  })
})

describe('a ValueXY or a Color', () => {
  test('timing moves each channel to its part of toValue, and calls back once', () => {
    const xy = new AnimatedValueXY({ x: 0, y: 100 })
    const done = vi.fn()
    timing(xy, { toValue: { x: 50, y: 0 }, duration: 100, useNativeDriver: false }).start(done)
    vi.advanceTimersByTime(50)
    const halfway = xy.__getValue()
    expect(halfway.x).toBeGreaterThan(0)
    expect(halfway.y).toBeLessThan(100)

    vi.advanceTimersByTime(100)

    expect(xy.__getValue()).toEqual({ x: 50, y: 0 })
    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: true })
  })

  test('a number as toValue moves each channel to it', () => {
    const xy = new AnimatedValueXY()
    timing(xy, { toValue: 7, duration: 0, useNativeDriver: false }).start()
    expect(xy.__getValue()).toEqual({ x: 7, y: 7 })
  })

  test('spring and decay give each channel its part of velocity', () => {
    const springing = new AnimatedValueXY()
    spring(springing, {
      toValue: { x: 0, y: 0 },
      velocity: { x: 1, y: -1 },
      useNativeDriver: false,
    }).start()
    const sliding = new AnimatedValueXY()
    decay(sliding, { velocity: { x: -1, y: 1 }, useNativeDriver: false }).start()

    vi.advanceTimersByTime(48)

    expect(springing.x.__getValue()).toBeGreaterThan(0)
    expect(springing.y.__getValue()).toBeLessThan(0)
    expect(sliding.x.__getValue()).toBeLessThan(0)
    expect(sliding.y.__getValue()).toBeGreaterThan(0)
  })

  test('another ValueXY as toValue: each channel follows its own channel', () => {
    const leader = new AnimatedValueXY()
    const follower = new AnimatedValueXY()
    timing(follower, { toValue: leader, duration: 100, useNativeDriver: false }).start()

    leader.setValue({ x: 30, y: -30 })
    vi.advanceTimersByTime(200)

    expect(follower.__getValue()).toEqual({ x: 30, y: -30 })
  })

  test('stop stops each channel, and the callback runs once with finished: false', () => {
    const xy = new AnimatedValueXY()
    const done = vi.fn()
    const animation = timing(xy, {
      toValue: { x: 100, y: 100 },
      duration: 100,
      useNativeDriver: false,
    })
    animation.start(done)
    vi.advanceTimersByTime(50)
    const at = xy.__getValue()

    animation.stop()
    vi.advanceTimersByTime(100)

    expect(done).toHaveBeenCalledExactlyOnceWith({ finished: false })
    expect(xy.__getValue()).toEqual(at)
  })

  test('timing moves a Color to { r, g, b, a }, and a spring follows another Color', () => {
    const color = new AnimatedColor('red')
    timing(color, {
      toValue: { r: 0, g: 0, b: 255, a: 0.5 },
      duration: 100,
      useNativeDriver: false,
    }).start()
    vi.advanceTimersByTime(150)
    expect(color.__getValue()).toBe('rgba(0, 0, 255, 0.5)')

    const leader = new AnimatedColor('black')
    spring(color, { toValue: leader, overshootClamping: true, useNativeDriver: false }).start()
    leader.setValue('white')
    vi.advanceTimersByTime(3000)
    expect(color.__getValue()).toBe('rgba(255, 255, 255, 1)')
  })

  test('throws for { x, y } with a single value, where React Native gives NaN', () => {
    const value = new AnimatedValue(0)
    const xy = { x: 1, y: 2 }
    expect(() =>
      spring(value, { toValue: 1, velocity: xy, useNativeDriver: false }).start(),
    ).toThrow('Animated: a velocity of { x, y } needs an Animated.ValueXY.')
    expect(() => decay(value, { velocity: xy, useNativeDriver: false }).start()).toThrow(
      'Animated: a velocity of { x, y } needs an Animated.ValueXY.',
    )
    expect(() => timing(value, { toValue: xy, useNativeDriver: false }).start()).toThrow(
      'Animated: toValue must be a number or an Animated node.',
    )
  })
})
