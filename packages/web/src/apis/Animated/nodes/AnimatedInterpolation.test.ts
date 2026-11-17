import { afterEach, describe, expect, test, vi } from 'vitest'

import { resetWarnings } from '../../../utils/warn'
import { Easing } from '../../Easing'
import type { NativeColorValue } from '../../StyleSheet/types'
import type { InterpolationConfigType } from './AnimatedInterpolation'
import { AnimatedValue } from './AnimatedValue'

const interpolate = <OutputT extends number | string | NativeColorValue>(
  input: number,
  config: InterpolationConfigType<OutputT>,
): OutputT => new AnimatedValue(input).interpolate(config).__getValue()

const percent = { inputRange: [0, 1], outputRange: [0, 100] }

afterEach(() => {
  vi.restoreAllMocks()
  resetWarnings()
})

describe('a number output', () => {
  test('maps the input range to the output range', () => {
    expect(interpolate(0.5, percent)).toBe(50)
    expect(interpolate(0, percent)).toBe(0)
    expect(interpolate(1, percent)).toBe(100)
  })

  test('uses the segment that holds the input', () => {
    const config = { inputRange: [0, 0.5, 1], outputRange: [0, 100, 0] }
    expect(interpolate(0.25, config)).toBe(50)
    expect(interpolate(0.5, config)).toBe(100)
    expect(interpolate(0.75, config)).toBe(50)
  })

  test('extends past the range by default', () => {
    expect(interpolate(2, percent)).toBe(200)
    expect(interpolate(-1, percent)).toBe(-100)
  })

  test('clamp stops at the range, and identity returns the input', () => {
    expect(interpolate(2, { ...percent, extrapolate: 'clamp' })).toBe(100)
    expect(interpolate(-1, { ...percent, extrapolate: 'clamp' })).toBe(0)
    expect(interpolate(2, { ...percent, extrapolate: 'identity' })).toBe(2)
    expect(interpolate(-3, { ...percent, extrapolate: 'identity' })).toBe(-3)
  })

  test('extrapolateLeft and extrapolateRight win over extrapolate', () => {
    const config = { ...percent, extrapolate: 'clamp', extrapolateRight: 'extend' } as const
    expect(interpolate(2, config)).toBe(200)
    expect(interpolate(-1, config)).toBe(0)
    expect(interpolate(-1, { ...percent, extrapolateLeft: 'identity' })).toBe(-1)
  })

  test('applies the easing to the progress in the segment', () => {
    expect(interpolate(0.5, { ...percent, easing: Easing.quad })).toBe(25)
  })

  test('a flat output, and an input range with a step', () => {
    expect(interpolate(0.3, { inputRange: [0, 1], outputRange: [5, 5] })).toBe(5)
    const step = { inputRange: [1, 1], outputRange: [0, 10] }
    expect(interpolate(0.5, step)).toBe(0)
    expect(interpolate(1, step)).toBe(0)
    expect(interpolate(2, step)).toBe(10)
  })

  test('an infinite end of a range', () => {
    expect(interpolate(7, { inputRange: [0, Infinity], outputRange: [0, Infinity] })).toBe(7)
    expect(interpolate(-3, { inputRange: [-Infinity, 0], outputRange: [-Infinity, 0] })).toBe(-3)
  })
})

describe('a string output', () => {
  test('interpolates each number and keeps the text between them', () => {
    expect(interpolate(0.25, { inputRange: [0, 1], outputRange: ['0deg', '360deg'] })).toBe('90deg')
    expect(interpolate(0.5, { inputRange: [0, 1], outputRange: ['-45deg', '45deg'] })).toBe('0deg')
    expect(
      interpolate(0.5, {
        inputRange: [0, 1],
        outputRange: ['translate(0px, 10px)', 'translate(100px, 30px)'],
      }),
    ).toBe('translate(50px, 20px)')
  })

  test('interpolates the channels of a color and gives rgba()', () => {
    expect(interpolate(0.5, { inputRange: [0, 1], outputRange: ['red', 'blue'] })).toBe(
      'rgba(128, 0, 128, 1)',
    )
    expect(
      interpolate(1 / 3, { inputRange: [0, 1], outputRange: ['transparent', '#000000'] }),
    ).toBe('rgba(0, 0, 0, 0.333)')
    expect(
      interpolate(0.5, { inputRange: [0, 1], outputRange: ['rgb(0, 0, 0)', 'rgb(10, 20, 30)'] }),
    ).toBe('rgba(5, 10, 15, 1)')
  })

  test('an interpolation of an interpolation', () => {
    const value = new AnimatedValue(0.3)
    const tenths = value.interpolate({ inputRange: [0, 1], outputRange: [0, 10] })
    const width = tenths.interpolate({ inputRange: [0, 10], outputRange: ['0%', '100%'] })
    expect(width.__getValue()).toBe('30%')
  })
})

describe('a color object output', () => {
  test('steps to the nearest color and warns once between two colors', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const light = { name: 'light' } as unknown as NativeColorValue
    const dark = { name: 'dark' } as unknown as NativeColorValue
    const config = { inputRange: [0, 1], outputRange: [light, dark] }

    expect(interpolate(0, config)).toBe(light)
    expect(interpolate(1, config)).toBe(dark)
    expect(warn).not.toHaveBeenCalled()
    expect(interpolate(0.6, config)).toBe(light)
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('in development, a wrong config throws', () => {
  const value = new AnimatedValue(0)

  test.each([
    ['inputRange must have at least 2 elements', { inputRange: [0], outputRange: [0, 1] }],
    ['outputRange must have at least 2 elements', { inputRange: [0, 1], outputRange: [0] }],
    [
      'inputRange must be monotonically non-decreasing 1,0',
      { inputRange: [1, 0], outputRange: [0, 1] },
    ],
    [
      'inputRange (3) and outputRange (2) must have the same length',
      { inputRange: [0, 1, 2], outputRange: [0, 1] },
    ],
    [
      'inputRange cannot be ]-infinity;+infinity[ -Infinity,Infinity',
      { inputRange: [-Infinity, Infinity], outputRange: [0, 1] },
    ],
  ])('%s', (message, config) => {
    expect(() => value.interpolate(config)).toThrow(message)
  })

  test.each([
    ['outputRange must contain color or value with numeric component', ['a', 'b']],
    [
      'All elements of output range should either be a color or a string with numeric components',
      ['red', '10px'],
    ],
    ['All elements of output range should have the same number of components', ['0px', '0px 1px']],
    ['All elements of output range should have the same non-numeric components', ['0deg', '1rad']],
  ])('%s', (message, outputRange) => {
    expect(() => value.interpolate({ inputRange: [0, 1], outputRange })).toThrow(message)
  })

  test('an interpolation of a string output', () => {
    const size = value.interpolate({ inputRange: [0, 1], outputRange: ['0px', '1px'] })
    const twice = size.interpolate({ inputRange: [0, 1], outputRange: [0, 2] })
    expect(() => twice.__getValue()).toThrow('Cannot interpolate an input which is not a number.')
  })
})
