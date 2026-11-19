import { describe, expect, test } from 'vitest'

import { easingFor } from './curves'

// React Native's progress curves, from `ReactCommon/react/renderer/animations/utils.cpp`.
const reactNative = {
  easeIn: (t: number) => Math.pow(t, 2),
  easeOut: (t: number) => 1 - Math.pow(1 - t, 2),
  easeInEaseOut: (t: number) => Math.cos((t + 1) * Math.PI) / 2 + 0.5,
  spring: (t: number, damping: number) =>
    1 + Math.pow(2, -10 * t) * Math.sin(((t - damping / 4) * Math.PI * 2) / damping),
}

const pointsOf = (easing: string): number[] =>
  easing.slice('linear('.length, -1).split(', ').map(Number)

describe('easingFor', () => {
  test('linear and keyboard are linear, as in React Native', () => {
    expect(easingFor('linear', 0.5)).toBe('linear')
    expect(easingFor('keyboard', 0.5)).toBe('linear')
  })

  test.each(['easeIn', 'easeOut', 'easeInEaseOut'] as const)(
    "%s follows React Native's curve in 60 even steps and ends at 1",
    (type) => {
      const points = pointsOf(easingFor(type, 0.5))
      expect(points).toHaveLength(61)
      points.slice(0, -1).forEach((point, i) => {
        expect(point).toBeCloseTo(reactNative[type](i / 60), 3)
      })
      expect(points.at(-1)).toBe(1)
    },
  )

  test('spring follows its damping, goes past 1, and ends at 1', () => {
    const points = pointsOf(easingFor('spring', 0.4))
    points.slice(0, -1).forEach((point, i) => {
      expect(point).toBeCloseTo(reactNative.spring(i / 60, 0.4), 3)
    })
    expect(Math.max(...points)).toBeGreaterThan(1)
    expect(points.at(-1)).toBe(1)
    expect(easingFor('spring', 0.7)).not.toBe(easingFor('spring', 0.4))
  })

  test('a spring with a damping of 0 falls back to linear', () => {
    expect(easingFor('spring', 0)).toBe('linear')
  })

  test('the browser takes each easing', () => {
    const element = document.createElement('div')
    for (const type of ['easeIn', 'easeOut', 'easeInEaseOut', 'spring'] as const) {
      const animation = element.animate(
        { opacity: [0, 1] },
        { duration: 1, easing: easingFor(type, 0.5) },
      )
      expect(animation.effect?.getTiming().easing).toContain('linear(')
      animation.cancel()
    }
  })
})
