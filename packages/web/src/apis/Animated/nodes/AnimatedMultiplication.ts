/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedMultiplication.js` of React Native, Copyright (c)
 * Meta Platforms, Inc. and affiliates.
 */

import { AnimatedInterpolation } from './AnimatedInterpolation'
import type { InterpolationConfigType } from './AnimatedInterpolation'
import type { AnimatedNode } from './AnimatedNode'
import { AnimatedValue } from './AnimatedValue'
import { AnimatedWithChildren } from './AnimatedWithChildren'

export class AnimatedMultiplication extends AnimatedWithChildren {
  private readonly a: AnimatedNode
  private readonly b: AnimatedNode

  constructor(a: AnimatedNode | number, b: AnimatedNode | number) {
    super()
    this.a = typeof a === 'number' ? new AnimatedValue(a) : a
    this.b = typeof b === 'number' ? new AnimatedValue(b) : b
  }

  override __getValue(): number {
    return (this.a.__getValue() as number) * (this.b.__getValue() as number)
  }

  interpolate<OutputT extends number | string>(
    config: InterpolationConfigType<OutputT>,
  ): AnimatedInterpolation<OutputT> {
    return new AnimatedInterpolation(this, config)
  }

  override __attach(): void {
    this.a.__addChild(this)
    this.b.__addChild(this)
    super.__attach()
  }

  override __detach(): void {
    this.a.__removeChild(this)
    this.b.__removeChild(this)
    super.__detach()
  }
}

export const multiply = (
  a: AnimatedNode | number,
  b: AnimatedNode | number,
): AnimatedMultiplication => new AnimatedMultiplication(a, b)
