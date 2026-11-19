/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedModulo.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { AnimatedInterpolation } from './AnimatedInterpolation'
import type { InterpolationConfigType } from './AnimatedInterpolation'
import type { AnimatedNode } from './AnimatedNode'
import { AnimatedWithChildren } from './AnimatedWithChildren'

export class AnimatedModulo extends AnimatedWithChildren {
  private readonly a: AnimatedNode
  private readonly modulus: number

  constructor(a: AnimatedNode, modulus: number) {
    super()
    this.a = a
    this.modulus = modulus
  }

  // Not JavaScript's `%`: a negative input gives a result from 0 up to the modulus.
  override __getValue(): number {
    return (((this.a.__getValue() as number) % this.modulus) + this.modulus) % this.modulus
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

export const modulo = (a: AnimatedNode, modulus: number): AnimatedModulo =>
  new AnimatedModulo(a, modulus)
