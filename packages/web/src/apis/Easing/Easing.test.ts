import { describe, expect, test } from 'vitest'

import { Easing } from './index'

const STEPS = Array.from({ length: 21 }, (_, i) => i / 20)

const at = (t: number, p1: number, p2: number) =>
  3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t

const overshoots = (curve: (t: number) => number) => STEPS.some((t) => curve(t) > 1)

// y for x on the curve, by bisection on t to the limit of a double.
const referenceBezier = (x1: number, y1: number, x2: number, y2: number) => {
  return (x: number) => {
    let low = 0
    let high = 1
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2
      if (at(mid, x1, x2) < x) low = mid
      else high = mid
    }
    return at((low + high) / 2, y1, y2)
  }
}

describe('Easing', () => {
  test('the power curves', () => {
    expect(Easing.linear(0.3)).toBe(0.3)
    expect(Easing.quad(0.5)).toBe(0.25)
    expect(Easing.cubic(0.5)).toBe(0.125)
    expect(Easing.poly(4)(0.5)).toBe(0.0625)
    expect(Easing.poly(5)(0.5)).toBe(0.03125)
  })

  test('sin, circle, and exp', () => {
    expect(Easing.sin(0.5)).toBeCloseTo(1 - Math.SQRT1_2, 12)
    expect(Easing.circle(0.6)).toBeCloseTo(0.2, 12)
    expect(Easing.exp(0.9)).toBeCloseTo(0.5, 12)
    expect(Easing.exp(0)).toBeCloseTo(1 / 1024, 12)
  })

  test('step0 is 1 above 0, and step1 is 1 from 1', () => {
    expect([-1, 0, 0.001, 1].map(Easing.step0)).toEqual([0, 0, 1, 1])
    expect([0, 0.999, 1, 2].map(Easing.step1)).toEqual([0, 0, 1, 1])
  })

  test('each curve starts at 0 and ends at 1', () => {
    const curves = [
      Easing.linear,
      Easing.ease,
      Easing.quad,
      Easing.cubic,
      Easing.poly(3),
      Easing.sin,
      Easing.circle,
      Easing.elastic(),
      Easing.elastic(3),
      Easing.back(),
      Easing.bounce,
      Easing.bezier(0.25, 0.1, 0.25, 1),
      Easing.out(Easing.quad),
      Easing.inOut(Easing.cubic),
    ]
    for (const curve of curves) {
      expect(curve(0)).toBeCloseTo(0, 12)
      expect(curve(1)).toBeCloseTo(1, 12)
    }
  })

  test('ease is the curve (0.42, 0, 1, 1), as in React Native', () => {
    const reference = referenceBezier(0.42, 0, 1, 1)
    for (const t of STEPS) expect(Easing.ease(t)).toBeCloseTo(reference(t), 4)
  })

  test('elastic overshoots once by default, and bounciness 0 never overshoots', () => {
    expect(overshoots(Easing.elastic())).toBe(true)
    expect(overshoots(Easing.elastic(0))).toBe(false)
    expect(Easing.elastic()(0.7)).toBe(Easing.elastic(1)(0.7))
  })

  test('back goes below 0 before it moves forward, by 1.70158 by default', () => {
    expect(Easing.back()(0.2)).toBeLessThan(0)
    expect(Easing.back()(0.2)).toBe(Easing.back(1.70158)(0.2))
    expect(Easing.back(0)(0.5)).toBe(Easing.cubic(0.5))
  })

  test('bounce touches 1 at each bounce and never passes it', () => {
    for (const t of [1 / 2.75, 2 / 2.75, 2.5 / 2.75]) expect(Easing.bounce(t)).toBeCloseTo(1, 12)
    for (const t of STEPS) expect(Easing.bounce(t)).toBeLessThanOrEqual(1)
    expect(Easing.bounce(0.5)).toBeCloseTo(0.765625, 12)
  })

  test('in keeps a curve, out turns it around, and inOut mirrors it at the middle', () => {
    expect(Easing.in(Easing.quad)).toBe(Easing.quad)
    expect(Easing.out(Easing.quad)(0.25)).toBe(0.4375)
    const inOut = Easing.inOut(Easing.quad)
    expect(inOut(0.25)).toBe(0.125)
    expect(inOut(0.5)).toBe(0.5)
    expect(inOut(0.75)).toBe(0.875)
    for (const t of STEPS) expect(inOut(t) + inOut(1 - t)).toBeCloseTo(1, 12)
  })
})

describe('Easing.bezier', () => {
  test('follows the curve within 0.0001', () => {
    const curves: [number, number, number, number][] = [
      [0.25, 0.1, 0.25, 1],
      [0.42, 0, 0.58, 1],
      [0, 0, 0.58, 1],
      [0.455, 0.03, 0.515, 0.955],
      [0.68, -0.55, 0.265, 1.55],
      [1, 0, 0, 1],
      [0, 1, 1, 0],
    ]
    for (const points of curves) {
      const curve = Easing.bezier(...points)
      const reference = referenceBezier(...points)
      for (const t of STEPS) expect(curve(t)).toBeCloseTo(reference(t), 4)
    }
  })

  test('is the identity when the control points are on the diagonal', () => {
    const curve = Easing.bezier(0.3, 0.3, 0.6, 0.6)
    for (const t of [-0.5, 0, 0.25, 0.9, 1.5]) expect(curve(t)).toBe(t)
  })

  test('returns 0 and 1 exactly at the ends, also for a y out of the range', () => {
    const curve = Easing.bezier(0.68, -0.55, 0.265, 1.55)
    expect(curve(0)).toBe(0)
    expect(curve(1)).toBe(1)
  })

  test('throws for an x out of [0, 1], as in React Native', () => {
    for (const points of [
      [-0.1, 0, 0.5, 1],
      [0.5, 0, 1.1, 1],
      [Number.NaN, 0, 0.5, 1],
    ] as [number, number, number, number][]) {
      expect(() => Easing.bezier(...points)).toThrow('bezier x values must be in [0, 1] range')
    }
  })
})
