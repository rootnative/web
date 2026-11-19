import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { Easing } from '../../Easing'
import type { Animation } from '../animations/Animation'
import { SpringAnimation } from '../animations/SpringAnimation'
import type { SpringAnimationConfigSingle } from '../animations/SpringAnimation'
import { TimingAnimation } from '../animations/TimingAnimation'
import { AnimatedValue } from '../nodes/AnimatedValue'
import { FRAME_MS, sampleTimes } from './curve'
import type { Curve } from './curve'

type Sample = { time: number; value: number }

// Runs `animation` on driver A and keeps each value that it sets, with its time after the start.
const runOnDriverA = (value: AnimatedValue, animation: Animation, delay = 0): Sample[] => {
  const samples: Sample[] = []
  const start = performance.now() + delay
  value.addListener(({ value: current }) =>
    samples.push({ time: performance.now() - start, value: current }),
  )
  value.animate(animation, null)
  return samples
}

// Each value of driver A before its last frame. The last frame of a spring also sets `toValue`,
// at a time on the 16 ms grid of the fake frames, not on the 60 Hz grid of the curve.
const beforeTheEnd = (samples: readonly Sample[]): Sample[] => {
  const end = samples.at(-1)?.time ?? 0
  return samples.filter((sample) => sample.time < end)
}

const expectSameValues = (curve: Curve, samples: readonly Sample[]): void => {
  expect(samples.length).toBeGreaterThan(3)
  for (const { time, value } of samples) expect(curve.valueAt(time)).toBeCloseTo(value, 9)
}

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

describe('sampleTimes', () => {
  test('one time for each 60 Hz frame, spread so that the last one is the duration', () => {
    expect(sampleTimes(300)).toHaveLength(19)
    expect(sampleTimes(300)[1]).toBeCloseTo(300 / 18, 9)
    expect(sampleTimes(260)).toHaveLength(17)
    expect(sampleTimes(260).at(-1)).toBe(260)
    expect(sampleTimes(5)).toEqual([0, 5])
  })
})

describe('the curve of a timing', () => {
  test('gives the values of driver A at the same times, and toValue from the duration on', () => {
    const value = new AnimatedValue(10)
    const animation = new TimingAnimation({
      toValue: 110,
      duration: 200,
      easing: Easing.bezier(0.3, 0.1, 0.2, 1.4),
      useNativeDriver: true,
    })
    const samples = runOnDriverA(value, animation)
    const curve = animation.curve()
    vi.advanceTimersByTime(250)

    expectSameValues(curve, samples)
    expect(curve.duration).toBe(200)
    expect(curve.valueAt(0)).toBe(10)
    expect(curve.valueAt(200)).toBe(110)
    expect(curve.valueAt(500)).toBe(110)
  })

  test('starts after the delay', () => {
    const value = new AnimatedValue(0)
    const animation = new TimingAnimation({
      toValue: 1,
      duration: 100,
      delay: 50,
      useNativeDriver: true,
    })
    const samples = runOnDriverA(value, animation, 50)
    vi.advanceTimersByTime(200)

    expectSameValues(animation.curve(), samples)
  })
})

const springOnDriverA = (
  config: Omit<SpringAnimationConfigSingle, 'useNativeDriver'>,
): { curve: Curve | null; samples: Sample[] } => {
  const value = new AnimatedValue(0)
  const animation = new SpringAnimation({ ...config, useNativeDriver: true })
  const samples = runOnDriverA(value, animation)
  const curve = animation.curve(10_000)
  vi.advanceTimersByTime(10_000)
  return { curve, samples }
}

describe('the curve of a spring', () => {
  test.each([
    ['the default spring, which moves past toValue', { toValue: 100 }],
    ['ζ ≥ 1, which never moves past it', { toValue: 100, stiffness: 100, damping: 40 }],
    ['a start velocity', { toValue: 100, velocity: 2 }],
    ['overshootClamping', { toValue: 100, overshootClamping: true }],
  ])('gives the values of driver A with %s', (_, config) => {
    const { curve, samples } = springOnDriverA(config)
    if (curve === null) throw new Error('no curve')
    expectSameValues(curve, beforeTheEnd(samples))
  })

  test('ends on the 60 Hz frame where driver A would end, at toValue', () => {
    const { curve, samples } = springOnDriverA({ toValue: 100 })
    if (curve === null) throw new Error('no curve')

    // Driver A ends on a fake frame, each 16 ms. The curve ends on a 60 Hz frame.
    const endOnDriverA = samples.at(-1)?.time ?? 0
    expect(Math.abs(curve.duration - endOnDriverA)).toBeLessThan(FRAME_MS)
    expect(Math.round(curve.duration / FRAME_MS) * FRAME_MS).toBeCloseTo(curve.duration, 6)
    expect(curve.valueAt(curve.duration)).toBe(100)
    expect(curve.valueAt(curve.duration - FRAME_MS)).not.toBe(100)
  })

  test('with overshootClamping, ends on the first frame past toValue', () => {
    const { curve } = springOnDriverA({ toValue: 100, overshootClamping: true })
    if (curve === null) throw new Error('no curve')

    expect(curve.valueAt(curve.duration - FRAME_MS)).toBeLessThan(100)
    expect(curve.duration).toBeLessThan(500)
  })

  test('a spring that takes over from a spring keeps its speed on both drivers', () => {
    const value = new AnimatedValue(0)
    value.animate(new SpringAnimation({ toValue: 100, useNativeDriver: true }), null)
    vi.advanceTimersByTime(48)

    const second = new SpringAnimation({ toValue: 0, useNativeDriver: true })
    const samples = runOnDriverA(value, second)
    const curve = second.curve(10_000)
    vi.advanceTimersByTime(10_000)
    if (curve === null) throw new Error('no curve')

    expectSameValues(curve, beforeTheEnd(samples))
    expect(curve.valueAt(FRAME_MS)).toBeGreaterThan(curve.valueAt(0))
  })

  test('is null for a spring that is not at rest within the limit', () => {
    const value = new AnimatedValue(0)
    const animation = new SpringAnimation({
      toValue: 100,
      stiffness: 100,
      damping: 0.01,
      useNativeDriver: true,
    })
    value.animate(animation, null)

    expect(animation.curve(1000)).toBeNull()
    animation.stop()
  })
})
