/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedColor.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import normalizeColor from '@react-native/normalize-colors'

import type { ColorValue, NativeColorValue } from '../../StyleSheet/types'
import type { AnimatedNodeConfig } from './AnimatedNode'
import { AnimatedValue, flushValue } from './AnimatedValue'
import { AnimatedWithChildren } from './AnimatedWithChildren'

export type AnimatedColorConfig = Readonly<AnimatedNodeConfig & { useNativeDriver: boolean }>

type ColorListenerCallback = (value: ColorValue) => unknown

export type RgbaValue = {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly a: number
}

type RgbaAnimatedValue = {
  readonly r: AnimatedValue
  readonly g: AnimatedValue
  readonly b: AnimatedValue
  readonly a: AnimatedValue
}

export type InputValue = RgbaValue | RgbaAnimatedValue | ColorValue | null | undefined

const defaultColor: RgbaValue = { r: 0, g: 0, b: 0, a: 1 }

const isRgbaValue = (value: unknown): value is RgbaValue =>
  typeof value === 'object' &&
  value !== null &&
  'r' in value &&
  typeof value.r === 'number' &&
  'g' in value &&
  typeof value.g === 'number' &&
  'b' in value &&
  typeof value.b === 'number' &&
  'a' in value &&
  typeof value.a === 'number'

const isRgbaAnimatedValue = (value: unknown): value is RgbaAnimatedValue =>
  typeof value === 'object' &&
  value !== null &&
  'r' in value &&
  value.r instanceof AnimatedValue &&
  'g' in value &&
  value.g instanceof AnimatedValue &&
  'b' in value &&
  value.b instanceof AnimatedValue &&
  'a' in value &&
  value.a instanceof AnimatedValue

// A color that `normalizeColor` can't read gives black, as in React Native. The web has no
// platform colors, so no color takes React Native's `nativeColor` path.
const toRgba = (color: RgbaValue | ColorValue | undefined): RgbaValue => {
  if (isRgbaValue(color)) return color
  if (typeof color !== 'string' && typeof color !== 'number') return defaultColor
  const packed = normalizeColor(color)
  if (packed === null || packed === undefined) return defaultColor
  return {
    r: (packed & 0xff000000) >>> 24,
    g: (packed & 0x00ff0000) >>> 16,
    b: (packed & 0x0000ff00) >>> 8,
    a: (packed & 0x000000ff) / 255,
  }
}

// Four `Animated.Value`s, `r`, `g`, `b` (0 to 255), and `a` (0 to 1). The output is an `rgba()`
// string, so the node goes in a color style.
export class AnimatedColor extends AnimatedWithChildren {
  r: AnimatedValue
  g: AnimatedValue
  b: AnimatedValue
  a: AnimatedValue
  nativeColor: NativeColorValue | null | undefined = null
  private suspendCallbacks = 0

  // `useNativeDriver` has no effect: the web runs each animation on the JavaScript driver.
  constructor(valueIn?: InputValue, _config?: AnimatedColorConfig | null) {
    super()
    const value = valueIn ?? defaultColor
    if (isRgbaAnimatedValue(value)) {
      this.r = value.r
      this.g = value.g
      this.b = value.b
      this.a = value.a
    } else {
      const initial = toRgba(value)
      this.r = new AnimatedValue(initial.r)
      this.g = new AnimatedValue(initial.g)
      this.b = new AnimatedValue(initial.b)
      this.a = new AnimatedValue(initial.a)
    }
  }

  // The listeners get the color once, after all four channels change.
  setValue(value: RgbaValue | ColorValue): void {
    const rgba = toRgba(value)
    this.withSuspendedCallbacks(() => {
      this.r.setValue(rgba.r)
      this.g.setValue(rgba.g)
      this.b.setValue(rgba.b)
      this.a.setValue(rgba.a)
    })
    flushValue(this)
    this.__callListeners(this.__getValue())
  }

  setOffset(offset: RgbaValue): void {
    this.r.setOffset(offset.r)
    this.g.setOffset(offset.g)
    this.b.setOffset(offset.b)
    this.a.setOffset(offset.a)
  }

  flattenOffset(): void {
    this.r.flattenOffset()
    this.g.flattenOffset()
    this.b.flattenOffset()
    this.a.flattenOffset()
  }

  extractOffset(): void {
    this.r.extractOffset()
    this.g.extractOffset()
    this.b.extractOffset()
    this.a.extractOffset()
  }

  stopAnimation(callback?: ColorListenerCallback): void {
    this.r.stopAnimation()
    this.g.stopAnimation()
    this.b.stopAnimation()
    this.a.stopAnimation()
    callback?.(this.__getValue())
  }

  resetAnimation(callback?: ColorListenerCallback): void {
    this.r.resetAnimation()
    this.g.resetAnimation()
    this.b.resetAnimation()
    this.a.resetAnimation()
    callback?.(this.__getValue())
  }

  override __getValue(): ColorValue {
    if (this.nativeColor != null) return this.nativeColor
    return `rgba(${this.r.__getValue()}, ${this.g.__getValue()}, ${this.b.__getValue()}, ${this.a.__getValue()})`
  }

  override __attach(): void {
    this.r.__addChild(this)
    this.g.__addChild(this)
    this.b.__addChild(this)
    this.a.__addChild(this)
    super.__attach()
  }

  override __detach(): void {
    this.r.__removeChild(this)
    this.g.__removeChild(this)
    this.b.__removeChild(this)
    this.a.__removeChild(this)
    super.__detach()
  }

  override __callListeners(value: unknown): void {
    if (this.suspendCallbacks === 0) super.__callListeners(value)
  }

  private withSuspendedCallbacks(callback: () => void): void {
    this.suspendCallbacks++
    callback()
    this.suspendCallbacks--
  }
}
