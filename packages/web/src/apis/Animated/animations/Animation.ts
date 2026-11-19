/**
 * @license MIT
 * A port of `Libraries/Animated/animations/Animation.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { Platform } from '../../Platform'
import type { AnimatedValue } from '../nodes/AnimatedValue'

export type EndResult = {
  finished: boolean
  value?: number | undefined
  offset?: number | undefined
}

export type EndCallback = (result: EndResult) => void

// React Native's `AnimatedPlatformConfig`, an empty type.
export type PlatformConfig = {}

export type AnimationConfig = Readonly<{
  isInteraction?: boolean | undefined
  useNativeDriver: boolean
  platformConfig?: PlatformConfig | undefined
  onComplete?: EndCallback | undefined
  iterations?: number | undefined
  isLooping?: boolean | undefined
  debugID?: string | undefined
}>

// The clock of the JavaScript driver. React Native reads `Date.now()`. `performance.now()` is
// monotonic, so a change of the system clock can't make an animation jump.
export const now = (): number => performance.now()

// As in the other components: with reduced motion, an animation goes to its end at once. A delay
// still waits, so a sequence keeps its order and its pauses.
export const isMotionReduced = (): boolean => Platform.isDisableAnimations

// `isInteraction`, `iterations`, and `platformConfig` have no effect here.
export class Animation {
  private onEnd: EndCallback | null | undefined
  protected active = false
  protected readonly useNativeDriver: boolean

  constructor(config?: AnimationConfig) {
    this.useNativeDriver = config?.useNativeDriver === true
  }

  start(
    _fromValue: number,
    _onUpdate: (value: number) => void,
    onEnd: EndCallback | null | undefined,
    _previousAnimation: Animation | null | undefined,
    _animatedValue?: AnimatedValue,
  ): void {
    this.onEnd = onEnd
    this.active = true
  }

  // The value at the current frame while the Web Animations driver runs the animation. The value
  // gets no frame of its own then.
  liveValue(): number | undefined {
    return undefined
  }

  stop(): void {
    this.active = false
  }

  // Calls the end callback once at most.
  protected notifyAnimationEnd(result: EndResult): void {
    const callback = this.onEnd
    if (callback) {
      this.onEnd = null
      callback(result)
    }
  }
}
