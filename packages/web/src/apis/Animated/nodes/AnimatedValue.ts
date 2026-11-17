/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedValue.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

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

  // `useNativeDriver` has no effect: the web runs each animation on the JavaScript driver.
  constructor(value: number, _config?: AnimatedValueConfig | null) {
    super()
    if (typeof value !== 'number') {
      throw new Error('AnimatedValue: Attempting to set value to undefined')
    }
    this.value = value
  }

  override __getValue(): number {
    return this.value + this.offset
  }

  setValue(value: number): void {
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

  interpolate<OutputT extends InterpolationConfigSupportedOutputType>(
    config: InterpolationConfigType<OutputT>,
  ): AnimatedInterpolation<OutputT> {
    return new AnimatedInterpolation(this, config)
  }

  // React Native skips the flush only for a value that the native driver moves.
  private updateValue(value: number): void {
    if (value === undefined) throw new Error('AnimatedValue: Attempting to set value to undefined')
    this.value = value
    flushValue(this)
    this.__callListeners(this.__getValue())
  }
}
