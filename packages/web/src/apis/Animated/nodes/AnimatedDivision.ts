/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedDivision.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { warnOnce } from '../../../utils/warn'
import { AnimatedInterpolation } from './AnimatedInterpolation'
import type { InterpolationConfigType } from './AnimatedInterpolation'
import { AnimatedNode } from './AnimatedNode'
import { AnimatedValue } from './AnimatedValue'
import { AnimatedWithChildren } from './AnimatedWithChildren'

export class AnimatedDivision extends AnimatedWithChildren {
  private readonly a: AnimatedNode
  private readonly b: AnimatedNode

  constructor(a: AnimatedNode | number, b: AnimatedNode | number) {
    super()
    if (b === 0 || (b instanceof AnimatedNode && b.__getValue() === 0)) {
      warnOnce(
        'animated-divide-by-zero-potential',
        'Animated: Detected potential division by zero in AnimatedDivision.',
      )
    }
    this.a = typeof a === 'number' ? new AnimatedValue(a) : a
    this.b = typeof b === 'number' ? new AnimatedValue(b) : b
  }

  // A division by zero gives 0, as in React Native.
  override __getValue(): number {
    const a = this.a.__getValue() as number
    const b = this.b.__getValue() as number
    if (b === 0) {
      warnOnce(
        'animated-divide-by-zero',
        'Animated: Detected division by zero in AnimatedDivision.',
      )
      return 0
    }
    return a / b
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

export const divide = (a: AnimatedNode | number, b: AnimatedNode | number): AnimatedDivision =>
  new AnimatedDivision(a, b)
