/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedInterpolation.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import normalizeColor from '@react-native/normalize-colors'

import { isProductionEnv } from '../../../utils/env'
import { warnOnce } from '../../../utils/warn'
import { Easing } from '../../Easing'
import type { NativeColorValue } from '../../StyleSheet/types'
import type { AnimatedNode, AnimatedNodeConfig } from './AnimatedNode'
import { AnimatedWithChildren } from './AnimatedWithChildren'

type ExtrapolateType = 'extend' | 'identity' | 'clamp'

export type InterpolationConfigSupportedOutputType = number | string | NativeColorValue

export type InterpolationConfigType<OutputT extends InterpolationConfigSupportedOutputType> =
  Readonly<
    AnimatedNodeConfig & {
      inputRange: readonly number[]
      outputRange: readonly OutputT[]
      easing?: ((input: number) => number) | undefined
      extrapolate?: ExtrapolateType | undefined
      extrapolateLeft?: ExtrapolateType | undefined
      extrapolateRight?: ExtrapolateType | undefined
    }
  >

type Interpolation<OutputT> = (input: number) => OutputT

const fail: (message: string) => never = (message) => {
  throw new Error(message)
}

const interpolateSegment = (
  input: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
  easing: (input: number) => number,
  extrapolateLeft: ExtrapolateType,
  extrapolateRight: ExtrapolateType,
): number => {
  let result = input

  if (result < inputMin) {
    if (extrapolateLeft === 'identity') return result
    if (extrapolateLeft === 'clamp') result = inputMin
  }
  if (result > inputMax) {
    if (extrapolateRight === 'identity') return result
    if (extrapolateRight === 'clamp') result = inputMax
  }

  if (outputMin === outputMax) return outputMin
  if (inputMin === inputMax) return input <= inputMin ? outputMin : outputMax

  if (inputMin === -Infinity) result = -result
  else if (inputMax === Infinity) result = result - inputMin
  else result = (result - inputMin) / (inputMax - inputMin)

  result = easing(result)

  if (outputMin === -Infinity) result = -result
  else if (outputMax === Infinity) result = result + outputMin
  else result = result * (outputMax - outputMin) + outputMin

  return result
}

// The index of the segment of `inputRange` that holds `input`. Out of the range, the first or the
// last segment.
const findRange = (input: number, inputRange: readonly number[]): number => {
  let i = 1
  for (; i < inputRange.length - 1; i++) {
    if ((inputRange[i] ?? 0) >= input) break
  }
  return i - 1
}

const createNumericInterpolation = (
  config: InterpolationConfigType<number>,
): Interpolation<number> => {
  const { inputRange, outputRange } = config
  const easing = config.easing ?? Easing.linear
  const extrapolateLeft = config.extrapolateLeft ?? config.extrapolate ?? 'extend'
  const extrapolateRight = config.extrapolateRight ?? config.extrapolate ?? 'extend'

  return (input) => {
    if (typeof input !== 'number') fail('Cannot interpolate an input which is not a number')
    const range = findRange(input, inputRange)
    return interpolateSegment(
      input,
      inputRange[range] ?? 0,
      inputRange[range + 1] ?? 0,
      outputRange[range] ?? 0,
      outputRange[range + 1] ?? 0,
      easing,
      extrapolateLeft,
      extrapolateRight,
    )
  }
}

// The web has no `PlatformColor`, so this runs only for a color object that a library makes. As in
// React Native's JavaScript driver, the output steps to the nearest color.
const createPlatformColorInterpolation = (
  config: InterpolationConfigType<NativeColorValue>,
): Interpolation<NativeColorValue> => {
  const { outputRange } = config
  const interpolateIndex = createNumericInterpolation({
    ...config,
    outputRange: outputRange.map((_, index) => index),
  })
  return (input) => {
    const index = interpolateIndex(input)
    if (!Number.isInteger(index)) {
      warnOnce(
        'animated-platform-color',
        "Animated: the web can't interpolate between two PlatformColor values. It uses the nearest color.",
      )
    }
    return outputRange[Math.floor(index)] as NativeColorValue
  }
}

type StringShape = { isColor: boolean; components: readonly (number | string)[] }

const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g

// A color becomes its four channels. Any other string becomes its numbers and the text between
// them, so `'-45deg'` is `[-45, 'deg']`.
const toStringShape = (input: string): StringShape => {
  const color = normalizeColor(input)
  if (typeof color === 'number') {
    const r = (color & 0xff000000) >>> 24
    const g = (color & 0x00ff0000) >>> 16
    const b = (color & 0x0000ff00) >>> 8
    const a = (color & 0x000000ff) / 255
    return { isColor: true, components: [r, g, b, a] }
  }

  const components: (number | string)[] = []
  let lastMatchEnd = 0
  for (const match of input.matchAll(NUMBER)) {
    if (match.index > lastMatchEnd) components.push(input.slice(lastMatchEnd, match.index))
    components.push(Number.parseFloat(match[0]))
    lastMatchEnd = match.index + match[0].length
  }
  if (components.length === 0) {
    fail('outputRange must contain color or value with numeric component')
  }
  if (lastMatchEnd < input.length) components.push(input.slice(lastMatchEnd))
  return { isColor: false, components }
}

const checkStringShapes = (shapes: readonly StringShape[]): void => {
  const [first] = shapes
  if (first === undefined) return
  if (!shapes.every((shape) => shape.isColor === first.isColor)) {
    fail(
      'All elements of output range should either be a color or a string with numeric components',
    )
  }
  if (!shapes.every((shape) => shape.components.length === first.components.length)) {
    fail('All elements of output range should have the same number of components')
  }
  const sameText = shapes.every((shape) =>
    shape.components.every(
      (component, i) => typeof component === 'number' || component === first.components[i],
    ),
  )
  if (!sameText) fail('All elements of output range should have the same non-numeric components')
}

// Interpolates each number of a string on its own and puts the string back together: colors such
// as `'rgba(123, 42, 99, 0.36)'` and values with units such as `'-45deg'`.
const createStringInterpolation = (
  config: InterpolationConfigType<string>,
): Interpolation<string> => {
  if (config.outputRange.length < 2) fail('Bad output range')
  const shapes = config.outputRange.map(toStringShape)
  if (!isProductionEnv()) checkStringShapes(shapes)

  const [first] = shapes
  const isColor = first?.isColor === true
  const numbers = shapes.map((shape) =>
    shape.components.filter((component): component is number => typeof component === 'number'),
  )
  const interpolations = (numbers[0] ?? []).map((_, i) =>
    createNumericInterpolation({ ...config, outputRange: numbers.map((list) => list[i] ?? 0) }),
  )

  if (isColor) {
    return (input) => {
      const [r, g, b, a] = interpolations.map((interpolation, i) => {
        const value = interpolation(input)
        return i < 3 ? Math.round(value) : Math.round(value * 1000) / 1000
      })
      return `rgba(${r}, ${g}, ${b}, ${a})`
    }
  }

  const template = first?.components ?? []
  return (input) => {
    const values = interpolations.map((interpolation) => interpolation(input))
    let i = 0
    return template
      .map((component) => (typeof component === 'number' ? values[i++] : component))
      .join('')
  }
}

const createInterpolation = <OutputT extends InterpolationConfigSupportedOutputType>(
  config: InterpolationConfigType<OutputT>,
): Interpolation<OutputT> => {
  const first = config.outputRange[0]
  if (typeof first === 'string') {
    return createStringInterpolation(
      config as InterpolationConfigType<string>,
    ) as Interpolation<OutputT>
  }
  if (typeof first === 'object') {
    return createPlatformColorInterpolation(
      config as InterpolationConfigType<NativeColorValue>,
    ) as Interpolation<OutputT>
  }
  return createNumericInterpolation(
    config as InterpolationConfigType<number>,
  ) as Interpolation<OutputT>
}

const checkInfiniteRange = (name: string, range: readonly unknown[]): void => {
  if (range.length < 2) fail(`${name} must have at least 2 elements`)
  if (range.length === 2 && range[0] === -Infinity && range[1] === Infinity) {
    fail(`${name} cannot be ]-infinity;+infinity[ ${String(range)}`)
  }
}

const checkValidRanges = (inputRange: readonly number[], outputRange: readonly unknown[]): void => {
  checkInfiniteRange('outputRange', outputRange)
  checkInfiniteRange('inputRange', inputRange)
  for (let i = 1; i < inputRange.length; i++) {
    if ((inputRange[i] ?? 0) < (inputRange[i - 1] ?? 0)) {
      fail(`inputRange must be monotonically non-decreasing ${String(inputRange)}`)
    }
  }
  if (inputRange.length !== outputRange.length) {
    fail(
      `inputRange (${inputRange.length}) and outputRange (${outputRange.length}) must have the same length`,
    )
  }
}

export class AnimatedInterpolation<
  OutputT extends InterpolationConfigSupportedOutputType,
> extends AnimatedWithChildren {
  private readonly parent: AnimatedNode
  private readonly config: InterpolationConfigType<OutputT>
  private interpolation: Interpolation<OutputT> | undefined

  constructor(parent: AnimatedNode, config: InterpolationConfigType<OutputT>) {
    super()
    this.parent = parent
    this.config = config
    // React Native checks the ranges only in development, and builds the function at once there.
    if (!isProductionEnv()) {
      checkValidRanges(config.inputRange, config.outputRange)
      this.getInterpolation()
    }
  }

  private getInterpolation(): Interpolation<OutputT> {
    this.interpolation ??= createInterpolation(this.config)
    return this.interpolation
  }

  override __getValue(): OutputT {
    const parentValue = this.parent.__getValue()
    if (typeof parentValue !== 'number') fail('Cannot interpolate an input which is not a number.')
    return this.getInterpolation()(parentValue)
  }

  interpolate<NewOutputT extends number | string>(
    config: InterpolationConfigType<NewOutputT>,
  ): AnimatedInterpolation<NewOutputT> {
    return new AnimatedInterpolation(this, config)
  }

  configKeys(): string[] {
    return Object.keys(this.config)
  }

  override __attach(): void {
    this.parent.__addChild(this)
    super.__attach()
  }

  override __detach(): void {
    this.parent.__removeChild(this)
    super.__detach()
  }
}
