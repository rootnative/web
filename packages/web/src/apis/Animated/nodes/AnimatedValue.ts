/**
 * @license MIT
 * A port of `Libraries/Animated/nodes/AnimatedValue.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import type { Animation, EndCallback } from '../animations/Animation'
import { checkNativeGraph } from '../nativeDriver/validate'
import type { AnimatedNode, AnimatedNodeConfig, ValueListenerCallback } from './AnimatedNode'
import { AnimatedInterpolation } from './AnimatedInterpolation'
import type {
  InterpolationConfigSupportedOutputType,
  InterpolationConfigType,
} from './AnimatedInterpolation'
import type { AnimatedTracking } from './AnimatedTracking'
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

const MOVED_TO_NATIVE =
  'Attempting to run JS driven animation on animated node that has been moved to "native" earlier by starting an animation with `useNativeDriver: true`'

let sampled: ReadonlyMap<AnimatedValue, number> | null = null

// Runs `read` with each value of `values` at its sample, so the graph gives its output at those
// values. Nothing flushes and no listener runs. The Web Animations driver reads its keyframes so.
export const withValues = <T>(values: ReadonlyMap<AnimatedValue, number>, read: () => T): T => {
  const before = sampled
  sampled = values
  try {
    return read()
  } finally {
    sampled = before
  }
}

export class AnimatedValue extends AnimatedWithChildren {
  private value: number
  private offset = 0
  private readonly startingValue: number
  private animation: Animation | null = null
  private tracking: AnimatedTracking | null = null
  private movedToNative = false

  // As in React Native, `useNativeDriver: true` in the config moves the value to the native side at
  // once.
  constructor(value: number, config?: AnimatedValueConfig | null) {
    super()
    if (typeof value !== 'number') {
      throw new Error('AnimatedValue: Attempting to set value to undefined')
    }
    this.value = value
    this.startingValue = value
    if (config?.useNativeDriver === true) this.markNative()
  }

  // React Native's `__makeNative`: after it, the JavaScript driver can't animate the value. An
  // animation with `useNativeDriver: true`, the config of a value, and a native event call it.
  markNative(): void {
    checkNativeGraph(this)
    this.movedToNative = true
  }

  // A value that leaves the graph stops its animation.
  override __detach(): void {
    this.stopAnimation()
    super.__detach()
  }

  override __getValue(): number {
    return (sampled?.get(this) ?? this.animation?.liveValue() ?? this.value) + this.offset
  }

  override addListener(callback: ValueListenerCallback): string {
    return super.addListener(callback)
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

  // Also ends the tracking of another node. `setValue` doesn't, as in React Native.
  stopAnimation(callback?: ((value: number) => void) | null): void {
    this.stopTracking()
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

  // A new animation stops the one that runs, and that one ends with `finished: false`. As in React
  // Native, a value that an animation with `useNativeDriver: true` moved stays there, so the
  // JavaScript driver can't animate it after that: on native, such code throws.
  animate(animation: Animation, callback: EndCallback | null | undefined): void {
    if (animation.useNativeDriver) {
      this.markNative()
    } else if (this.movedToNative) {
      throw new Error(MOVED_TO_NATIVE)
    }
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
      this,
    )
  }

  stopTracking(): void {
    this.tracking?.__detach()
    this.tracking = null
  }

  // Starts an animation to the current output of the tracked node at once.
  track(tracking: AnimatedTracking): void {
    this.stopTracking()
    this.tracking = tracking
    tracking.update()
  }

  // React Native skips the flush only for a value that the native driver moves.
  private updateValue(value: number): void {
    if (value === undefined) throw new Error('AnimatedValue: Attempting to set value to undefined')
    this.value = value
    flushValue(this)
    this.__callListeners(this.__getValue())
  }
}
