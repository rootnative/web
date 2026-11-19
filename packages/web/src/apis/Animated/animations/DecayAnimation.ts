/**
 * @license MIT
 * A port of `Libraries/Animated/animations/DecayAnimation.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { Animation, isMotionReduced, now } from './Animation'
import type { AnimationConfig, EndCallback } from './Animation'

export type DecayAnimationConfigSingle = Readonly<
  AnimationConfig & {
    velocity: number
    deceleration?: number | undefined
  }
>

// The value moves at `velocity` (units per millisecond) and slows by `deceleration` each
// millisecond. It ends on the first frame that moves it less than 0.1.
export class DecayAnimation extends Animation {
  private startTime = 0
  private fromValue = 0
  private lastValue = 0
  private readonly deceleration: number
  private readonly velocity: number
  private setValue: (value: number) => void = () => {}
  private frame: number | undefined

  constructor(config: DecayAnimationConfigSingle) {
    super()
    this.deceleration = config.deceleration ?? 0.998
    this.velocity = config.velocity
  }

  override start(
    fromValue: number,
    onUpdate: (value: number) => void,
    onEnd: EndCallback | null | undefined,
    previousAnimation: Animation | null | undefined,
  ): void {
    super.start(fromValue, onUpdate, onEnd, previousAnimation)
    this.lastValue = fromValue
    this.fromValue = fromValue
    this.setValue = onUpdate
    this.startTime = now()
    if (isMotionReduced()) {
      // The value where the motion would come to rest.
      this.setValue(this.fromValue + this.velocity / (1 - this.deceleration))
      this.notifyAnimationEnd({ finished: true })
    } else {
      this.frame = requestAnimationFrame(() => this.onUpdate())
    }
  }

  onUpdate(): void {
    const value =
      this.fromValue +
      (this.velocity / (1 - this.deceleration)) *
        (1 - Math.exp(-(1 - this.deceleration) * (now() - this.startTime)))
    this.setValue(value)
    if (Math.abs(this.lastValue - value) < 0.1) {
      this.notifyAnimationEnd({ finished: true })
      return
    }
    this.lastValue = value
    if (this.active) this.frame = requestAnimationFrame(() => this.onUpdate())
  }

  override stop(): void {
    super.stop()
    if (this.frame !== undefined) cancelAnimationFrame(this.frame)
    this.notifyAnimationEnd({ finished: false })
  }
}
