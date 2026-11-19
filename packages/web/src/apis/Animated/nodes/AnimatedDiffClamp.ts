/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedDiffClamp.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { AnimatedInterpolation } from './AnimatedInterpolation'
import type { InterpolationConfigType } from './AnimatedInterpolation'
import type { AnimatedNode } from './AnimatedNode'
import { AnimatedWithChildren } from './AnimatedWithChildren'

// Adds each change of the input to its own value and clamps the sum. So the output moves as soon as
// the input turns back, also when the input is far out of the range.
export class AnimatedDiffClamp extends AnimatedWithChildren {
  private readonly a: AnimatedNode
  private readonly min: number
  private readonly max: number
  private value: number
  private lastValue: number

  constructor(a: AnimatedNode, min: number, max: number) {
    super()
    this.a = a
    this.min = min
    this.max = max
    this.value = this.lastValue = a.__getValue() as number
  }

  // Each read takes the change since the last read, as in React Native. A second read of the same
  // input adds nothing.
  override __getValue(): number {
    const value = this.a.__getValue() as number
    const diff = value - this.lastValue
    this.lastValue = value
    this.value = Math.min(Math.max(this.value + diff, this.min), this.max)
    return this.value
  }

  interpolate<OutputT extends number | string>(
    config: InterpolationConfigType<OutputT>,
  ): AnimatedInterpolation<OutputT> {
    return new AnimatedInterpolation(this, config)
  }

  override __attach(): void {
    this.a.__addChild(this)
    super.__attach()
  }

  override __detach(): void {
    this.a.__removeChild(this)
    super.__detach()
  }
}

export const diffClamp = (a: AnimatedNode, min: number, max: number): AnimatedDiffClamp =>
  new AnimatedDiffClamp(a, min, max)
