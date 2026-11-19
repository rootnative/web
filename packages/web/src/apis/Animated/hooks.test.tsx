import type { ReactNode } from 'react'
import { afterEach, describe, expect, test } from 'vitest'

import { cleanup, render } from '../../test/render'
import { useAnimatedColor, useAnimatedValue, useAnimatedValueXY } from './hooks'
import { AnimatedColor } from './nodes/AnimatedColor'
import { AnimatedValue } from './nodes/AnimatedValue'
import { AnimatedValueXY } from './nodes/AnimatedValueXY'

afterEach(cleanup)

type Made = { value: AnimatedValue; xy: AnimatedValueXY; color: AnimatedColor }

const madeOnEachRender: Made[] = []

const Probe = ({ start }: { start: number }): ReactNode => {
  madeOnEachRender.push({
    value: useAnimatedValue(start),
    xy: useAnimatedValueXY({ x: start, y: start }),
    color: useAnimatedColor(start === 0 ? 'red' : 'blue'),
  })
  return null
}

describe('useAnimatedValue, useAnimatedValueXY, and useAnimatedColor', () => {
  test('make a value on the first render and return it again, also with new arguments', () => {
    madeOnEachRender.length = 0
    const { rerender } = render(<Probe start={0} />)
    rerender(<Probe start={5} />)

    const [first, second] = madeOnEachRender
    expect(first?.value).toBeInstanceOf(AnimatedValue)
    expect(first?.xy).toBeInstanceOf(AnimatedValueXY)
    expect(first?.color).toBeInstanceOf(AnimatedColor)
    expect(second?.value).toBe(first?.value)
    expect(second?.xy).toBe(first?.xy)
    expect(second?.color).toBe(first?.color)
    expect(second?.value.__getValue()).toBe(0)
    expect(second?.xy.__getValue()).toEqual({ x: 0, y: 0 })
    expect(second?.color.__getValue()).toBe('rgba(255, 0, 0, 1)')
  })
})
