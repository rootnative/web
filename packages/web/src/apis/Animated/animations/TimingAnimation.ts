/**
 * @license MIT
 * A port of `Libraries/Animated/animations/TimingAnimation.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { Easing } from '../../Easing'
import type { EasingFunction } from '../../Easing'
import type { Curve } from '../nativeDriver/curve'
import { startNativeRun } from '../nativeDriver/driver'
import type { NativeRun } from '../nativeDriver/driver'
import type { AnimatedValue } from '../nodes/AnimatedValue'
import { Animation, isMotionReduced, now } from './Animation'
import type { AnimationConfig, EndCallback } from './Animation'

export type TimingAnimationConfigSingle = Readonly<
  AnimationConfig & {
    toValue: number
    easing?: ((value: number) => number) | undefined
    duration?: number | undefined
    delay?: number | undefined
  }
>

let easeInOut: EasingFunction | undefined

export class TimingAnimation extends Animation {
  private startTime = 0
  private fromValue = 0
  private readonly toValue: number
  private readonly duration: number
  private readonly delay: number
  private readonly easing: EasingFunction
  private setValue: (value: number) => void = () => {}
  private frame: number | undefined
  private timeout: ReturnType<typeof setTimeout> | undefined
  private native: NativeRun | null = null

  constructor(config: TimingAnimationConfigSingle) {
    super(config)
    this.toValue = config.toValue
    this.easing = config.easing ?? (easeInOut ??= Easing.inOut(Easing.ease))
    this.duration = config.duration ?? 500
    this.delay = config.delay ?? 0
  }

  override start(
    fromValue: number,
    onUpdate: (value: number) => void,
    onEnd: EndCallback | null | undefined,
    previousAnimation: Animation | null | undefined,
    animatedValue?: AnimatedValue,
  ): void {
    super.start(fromValue, onUpdate, onEnd, previousAnimation)
    this.fromValue = fromValue
    this.setValue = onUpdate

    const start = (): void => {
      this.startTime = now()
      if (this.duration === 0 || isMotionReduced()) {
        this.setValue(this.toValue)
        this.notifyAnimationEnd({ finished: true })
      } else if (!this.startNative(animatedValue)) {
        this.frame = requestAnimationFrame(() => this.onUpdate())
      }
    }
    if (this.delay) this.timeout = setTimeout(start, this.delay)
    else start()
  }

  // As in React Native, the last value uses `easing(1)`. A custom curve that doesn't end at 1 ends
  // short of `toValue`.
  private valueAt(time: number): number {
    const progress = this.easing(time >= this.duration ? 1 : time / this.duration)
    return this.fromValue + progress * (this.toValue - this.fromValue)
  }

  // For the Web Animations driver, after `start`. The time starts after the delay.
  curve(): Curve {
    return { duration: this.duration, valueAt: (time) => this.valueAt(time) }
  }

  private startNative(value: AnimatedValue | undefined): boolean {
    if (!this.useNativeDriver || value === undefined) return false
    this.native = startNativeRun(
      value,
      () => this.curve(),
      this.setValue,
      () => {
        this.native = null
        this.notifyAnimationEnd({ finished: true })
      },
    )
    return this.native !== null
  }

  override liveValue(): number | undefined {
    return this.native?.liveValue()
  }

  onUpdate(): void {
    const time = now() - this.startTime
    this.setValue(this.valueAt(time))
    if (time >= this.duration) {
      this.notifyAnimationEnd({ finished: true })
      return
    }
    if (this.active) this.frame = requestAnimationFrame(() => this.onUpdate())
  }

  override stop(): void {
    super.stop()
    clearTimeout(this.timeout)
    if (this.frame !== undefined) cancelAnimationFrame(this.frame)
    const run = this.native
    if (run !== null) {
      this.native = null
      run.stop()
    }
    this.notifyAnimationEnd({ finished: false })
  }
}
