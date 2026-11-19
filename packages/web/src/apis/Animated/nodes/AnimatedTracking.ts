/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedTracking.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import type { Animation, EndCallback } from '../animations/Animation'
import { AnimatedNode } from './AnimatedNode'

type TrackingValue = {
  animate: (animation: Animation, callback: EndCallback | null | undefined) => void
}

// A leaf of the graph under the node that a value follows. Each change of that node starts a new
// animation of the value to the new output. The new animation stops the one before, so the callback
// gets `finished: false` for each change, as in React Native.
//
// React Native takes the animation class and its config. This port takes one function that makes
// the animation for a `toValue`, so the class needs no `any`.
export class AnimatedTracking extends AnimatedNode {
  private readonly value: TrackingValue
  private readonly parent: AnimatedNode
  private readonly makeAnimation: (toValue: number) => Animation
  private readonly callback: EndCallback | null | undefined

  constructor(
    value: TrackingValue,
    parent: AnimatedNode,
    makeAnimation: (toValue: number) => Animation,
    callback?: EndCallback | null,
  ) {
    super()
    this.value = value
    this.parent = parent
    this.makeAnimation = makeAnimation
    this.callback = callback
    this.__attach()
  }

  override __getValue(): unknown {
    return this.parent.__getValue()
  }

  override __attach(): void {
    this.parent.__addChild(this)
    super.__attach()
  }

  override __detach(): void {
    this.parent.__removeChild(this)
    super.__detach()
  }

  update(): void {
    this.value.animate(this.makeAnimation(this.parent.__getValue() as number), this.callback)
  }
}
