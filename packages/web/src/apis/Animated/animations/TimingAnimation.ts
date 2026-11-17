/**
 * @license MIT
 * A port of `Libraries/Animated/animations/TimingAnimation.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { Easing } from '../../Easing'
import type { EasingFunction } from '../../Easing'
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

  constructor(config: TimingAnimationConfigSingle) {
    super()
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
  ): void {
    super.start(fromValue, onUpdate, onEnd, previousAnimation)
    this.fromValue = fromValue
    this.setValue = onUpdate

    const start = (): void => {
      this.startTime = now()
      if (this.duration === 0 || isMotionReduced()) {
        this.setValue(this.toValue)
        this.notifyAnimationEnd({ finished: true })
      } else {
        this.frame = requestAnimationFrame(() => this.onUpdate())
      }
    }
    if (this.delay) this.timeout = setTimeout(start, this.delay)
    else start()
  }

  onUpdate(): void {
    const time = now()
    if (time >= this.startTime + this.duration) {
      // As in React Native, the last value uses `easing(1)`. A custom curve that doesn't end at 1
      // ends short of `toValue`.
      this.setValue(this.fromValue + this.easing(1) * (this.toValue - this.fromValue))
      this.notifyAnimationEnd({ finished: true })
      return
    }
    const progress = this.easing((time - this.startTime) / this.duration)
    this.setValue(this.fromValue + progress * (this.toValue - this.fromValue))
    if (this.active) this.frame = requestAnimationFrame(() => this.onUpdate())
  }

  override stop(): void {
    super.stop()
    clearTimeout(this.timeout)
    if (this.frame !== undefined) cancelAnimationFrame(this.frame)
    this.notifyAnimationEnd({ finished: false })
  }
}
