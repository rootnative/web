/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedValue.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import type { Animation, EndCallback } from '../animations/Animation'
import type { AnimatedNode, AnimatedNodeConfig } from './AnimatedNode'
import { AnimatedInterpolation } from './AnimatedInterpolation'
import type {
  InterpolationConfigSupportedOutputType,
  InterpolationConfigType,
} from './AnimatedInterpolation'
import { AnimatedWithChildren } from './AnimatedWithChildren'

export type AnimatedValueConfig = Readonly<AnimatedNodeConfig & { useNativeDriver: boolean }>

type UpdatableNode = AnimatedNode & { update: () => void }

const isUpdatable = (node: AnimatedNode): node is UpdatableNode =>
  'update' in node && typeof node.update === 'function'

// A change goes down the graph to the leaves, the nodes with `update()`: the props of an animated
// component. Each leaf then reads its values back up the graph. A leaf under two paths updates once.
export const flushValue = (root: AnimatedNode): void => {
  const leaves = new Set<UpdatableNode>()
  const findLeaves = (node: AnimatedNode): void => {
    if (isUpdatable(node)) leaves.add(node)
    else for (const child of node.__getChildren()) findLeaves(child)
  }
  findLeaves(root)
  for (const leaf of leaves) leaf.update()
}

export class AnimatedValue extends AnimatedWithChildren {
  private value: number
  private offset = 0
  private readonly startingValue: number
  private animation: Animation | null = null

  // `useNativeDriver` has no effect: the web runs each animation on the JavaScript driver.
  constructor(value: number, _config?: AnimatedValueConfig | null) {
    super()
    if (typeof value !== 'number') {
      throw new Error('AnimatedValue: Attempting to set value to undefined')
    }
    this.value = value
    this.startingValue = value
  }

  // A value that leaves the graph stops its animation.
  override __detach(): void {
    this.stopAnimation()
    super.__detach()
  }

  override __getValue(): number {
    return this.value + this.offset
  }

  setValue(value: number): void {
    this.animation?.stop()
    this.animation = null
    this.updateValue(value)
  }

  // As in React Native, a new offset doesn't update the graph. The next change shows it.
  setOffset(offset: number): void {
    this.offset = offset
  }

  flattenOffset(): void {
    this.value += this.offset
    this.offset = 0
  }

  extractOffset(): void {
    this.offset += this.value
    this.value = 0
  }

  stopAnimation(callback?: ((value: number) => void) | null): void {
    this.animation?.stop()
    this.animation = null
    callback?.(this.__getValue())
  }

  // As in React Native, the reset doesn't update the graph. The next change shows it.
  resetAnimation(callback?: ((value: number) => void) | null): void {
    this.stopAnimation(callback)
    this.value = this.startingValue
  }

  interpolate<OutputT extends InterpolationConfigSupportedOutputType>(
    config: InterpolationConfigType<OutputT>,
  ): AnimatedInterpolation<OutputT> {
    return new AnimatedInterpolation(this, config)
  }

  // A new animation stops the one that runs, and that one ends with `finished: false`.
  animate(animation: Animation, callback: EndCallback | null | undefined): void {
    const previous = this.animation
    previous?.stop()
    this.animation = animation
    animation.start(
      this.value,
      (value) => this.updateValue(value),
      (result) => {
        this.animation = null
        callback?.(result)
      },
      previous,
    )
  }

  // React Native skips the flush only for a value that the native driver moves.
  private updateValue(value: number): void {
    if (value === undefined) throw new Error('AnimatedValue: Attempting to set value to undefined')
    this.value = value
    flushValue(this)
    this.__callListeners(this.__getValue())
  }
}
