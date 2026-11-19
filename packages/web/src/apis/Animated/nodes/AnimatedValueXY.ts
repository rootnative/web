/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedValueXY.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { invariant } from '../../../utils/invariant'
import type { AnimatedNodeConfig } from './AnimatedNode'
import { AnimatedValue } from './AnimatedValue'
import { AnimatedWithChildren } from './AnimatedWithChildren'

export type AnimatedValueXYConfig = Readonly<AnimatedNodeConfig & { useNativeDriver: boolean }>

type XY = { x: number; y: number }

type ValueXYListenerCallback = (value: XY) => unknown

let nextListenerId = 1

// Two `Animated.Value`s, `x` and `y`, for a 2D motion such as a drag.
export class AnimatedValueXY extends AnimatedWithChildren {
  x: AnimatedValue
  y: AnimatedValue
  private listenerIds: Record<string, { x: string; y: string }> = {}

  // As in React Native, `useNativeDriver: true` in the config moves `x` and `y` to the native side.
  constructor(
    valueIn?: {
      readonly x: number | AnimatedValue
      readonly y: number | AnimatedValue
    } | null,
    config?: AnimatedValueXYConfig | null,
  ) {
    super()
    const value = valueIn ?? { x: 0, y: 0 }
    if (typeof value.x === 'number' && typeof value.y === 'number') {
      this.x = new AnimatedValue(value.x)
      this.y = new AnimatedValue(value.y)
    } else {
      invariant(
        value.x instanceof AnimatedValue && value.y instanceof AnimatedValue,
        'AnimatedValueXY must be initialized with an object of numbers or AnimatedValues.',
      )
      this.x = value.x
      this.y = value.y
    }
    if (config?.useNativeDriver === true) {
      this.x.markNative()
      this.y.markNative()
    }
  }

  setValue(value: XY): void {
    this.x.setValue(value.x)
    this.y.setValue(value.y)
  }

  setOffset(offset: XY): void {
    this.x.setOffset(offset.x)
    this.y.setOffset(offset.y)
  }

  flattenOffset(): void {
    this.x.flattenOffset()
    this.y.flattenOffset()
  }

  extractOffset(): void {
    this.x.extractOffset()
    this.y.extractOffset()
  }

  override __getValue(): XY {
    return { x: this.x.__getValue(), y: this.y.__getValue() }
  }

  resetAnimation(callback?: (value: XY) => void): void {
    this.x.resetAnimation()
    this.y.resetAnimation()
    callback?.(this.__getValue())
  }

  stopAnimation(callback?: (value: XY) => void): void {
    this.x.stopAnimation()
    this.y.stopAnimation()
    callback?.(this.__getValue())
  }

  // The listener gets `{ x, y }` once for each change of `x` and once for each change of `y`. So a
  // `setValue` calls it two times, as in React Native.
  override addListener(callback: ValueXYListenerCallback): string {
    const id = String(nextListenerId++)
    const jointCallback = (): void => {
      callback(this.__getValue())
    }
    this.listenerIds[id] = {
      x: this.x.addListener(jointCallback),
      y: this.y.addListener(jointCallback),
    }
    return id
  }

  override removeListener(id: string): void {
    const ids = this.listenerIds[id]
    if (!ids) return
    this.x.removeListener(ids.x)
    this.y.removeListener(ids.y)
    delete this.listenerIds[id]
  }

  // As in React Native, this also removes the listeners that were added to `x` and `y` directly.
  override removeAllListeners(): void {
    this.x.removeAllListeners()
    this.y.removeAllListeners()
    this.listenerIds = {}
  }

  getLayout(): { [key: string]: AnimatedValue } {
    return { left: this.x, top: this.y }
  }

  getTranslateTransform(): ({ translateX: AnimatedValue } | { translateY: AnimatedValue })[] {
    return [{ translateX: this.x }, { translateY: this.y }]
  }

  override __attach(): void {
    this.x.__addChild(this)
    this.y.__addChild(this)
    super.__attach()
  }

  override __detach(): void {
    this.x.__removeChild(this)
    this.y.__removeChild(this)
    super.__detach()
  }
}
