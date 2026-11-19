import { describe, expect, test, vi } from 'vitest'

import { add } from '../nodes/AnimatedAddition'
import { multiply } from '../nodes/AnimatedMultiplication'
import { AnimatedProps } from '../nodes/AnimatedProps'
import { AnimatedValue } from '../nodes/AnimatedValue'
import type { Curve } from './curve'
import { buildKeyframes } from './keyframes'

// From `from` to `to` in `duration` ms, then `to`.
const linear = (from: number, to: number, duration: number): Curve => ({
  duration,
  valueAt: (time) => from + (to - from) * Math.min(1, time / duration),
})

const leafOf = (style: unknown): AnimatedProps => {
  const leaf = new AnimatedProps({ style })
  leaf.__attach()
  return leaf
}

describe('buildKeyframes', () => {
  test('resolves the whole style of the leaf at each 60 Hz sample, through interpolate', () => {
    const value = new AnimatedValue(0)
    const translateX = value.interpolate({ inputRange: [0, 1], outputRange: [0, 100] })
    const style = [
      { width: 10 },
      { opacity: value, transform: [{ translateX }, { rotate: '45deg' }] },
    ]

    const keyframes = buildKeyframes(
      leafOf(style),
      style,
      ['transform', 'opacity'],
      [{ value, curve: linear(0, 1, 100) }],
      100,
    )

    expect(keyframes.map((keyframe) => keyframe.offset)).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map((i) => i / 6),
    )
    expect(keyframes[3]).toEqual({
      offset: 0.5,
      opacity: '0.5',
      transform: 'translateX(50px) rotate(45deg)',
    })
    expect(keyframes[6]).toEqual({
      offset: 1,
      opacity: '1',
      transform: 'translateX(100px) rotate(45deg)',
    })
  })

  test('runs the math nodes, a string output, and the offset of the value', () => {
    const value = new AnimatedValue(0)
    value.setOffset(1)
    const rotate = value.interpolate({ inputRange: [1, 2], outputRange: ['0deg', '90deg'] })
    const style = { transform: [{ translateY: add(multiply(value, 10), 5) }, { rotate }] }

    const keyframes = buildKeyframes(
      leafOf(style),
      style,
      ['transform'],
      [{ value, curve: linear(0, 1, 100) }],
      100,
    )

    expect(keyframes[0]?.['transform']).toBe('translateY(15px) rotate(0deg)')
    expect(keyframes[3]?.['transform']).toBe('translateY(20px) rotate(45deg)')
    expect(keyframes[6]?.['transform']).toBe('translateY(25px) rotate(90deg)')
  })

  test('keeps only the properties that it gets', () => {
    const value = new AnimatedValue(0)
    const style = { opacity: value, transform: [{ scale: value }] }

    const keyframes = buildKeyframes(
      leafOf(style),
      style,
      ['opacity'],
      [{ value, curve: linear(0, 1, 50) }],
      50,
    )

    for (const keyframe of keyframes)
      expect(new Set(Object.keys(keyframe))).toEqual(new Set(['offset', 'opacity']))
  })

  test('gives each value its own curve, and a curve that ends first keeps its end value', () => {
    const x = new AnimatedValue(0)
    const y = new AnimatedValue(0)
    const style = { transform: [{ translateX: x }, { translateY: y }] }

    const keyframes = buildKeyframes(
      leafOf(style),
      style,
      ['transform'],
      [
        { value: x, curve: linear(0, 100, 100) },
        { value: y, curve: linear(0, 50, 50) },
      ],
      100,
    )

    expect(keyframes[3]?.['transform']).toBe('translateX(50px) translateY(50px)')
    expect(keyframes[6]?.['transform']).toBe('translateX(100px) translateY(50px)')
  })

  test('changes nothing in the graph: no flush, no listener, and the value stays', () => {
    const value = new AnimatedValue(3)
    const listener = vi.fn()
    value.addListener(listener)
    const style = { opacity: value }
    const leaf = leafOf(style)
    const update = vi.fn()
    leaf.setUpdateCallback(update)

    buildKeyframes(leaf, style, ['opacity'], [{ value, curve: linear(0, 1, 50) }], 50)

    expect(value.__getValue()).toBe(3)
    expect(listener).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
