/**
 * @license MIT
 * A port of `Libraries/LayoutAnimation/LayoutAnimation.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { hasDOM } from '../../utils/env'
import { Platform } from '../Platform'
import { animateNextLayout, cancelNextLayout, parseConfig } from './engine'
import type {
  LayoutAnimationConfig,
  LayoutAnimationProperties,
  LayoutAnimationProperty,
  LayoutAnimationType,
  LayoutAnimationTypes,
} from './types'

export type {
  LayoutAnimationAnim,
  LayoutAnimationConfig,
  LayoutAnimationProperties,
  LayoutAnimationProperty,
  LayoutAnimationType,
  LayoutAnimationTypes,
} from './types'

type OnAnimationDidEndCallback = () => void
type OnAnimationDidFailCallback = () => void

let isEnabled = true

// As in React Native, `onAnimationDidEnd` runs once: when the animations end, or one frame and
// 1 ms after the duration, whichever is first. A config that React Native can't read calls
// `onAnimationDidFail` and animates nothing.
//
// React Native returns at once with reduced motion (`Platform.isDisableAnimations`, a test switch
// on native) and never calls `onAnimationDidEnd`. Here the switch follows the user's setting, so
// nothing animates, and the callback still runs: an app that waits for it goes on. The same holds
// after `setEnabled(false)`.
const configureNext = (
  config: LayoutAnimationConfig,
  onAnimationDidEnd?: OnAnimationDidEndCallback,
  onAnimationDidFail?: OnAnimationDidFailCallback,
): void => {
  if (!hasDOM()) return
  const wait = (config.duration ?? 0) + 17
  let ended = false
  const end = (): void => {
    if (ended) return
    ended = true
    clearTimeout(timer)
    onAnimationDidEnd?.()
  }
  const timer = setTimeout(end, wait)

  const parsed = parseConfig(config)
  if (parsed === null) {
    queueMicrotask(() => onAnimationDidFail?.())
    return
  }
  if (!isEnabled || Platform.isDisableAnimations) return
  animateNextLayout(parsed, wait, end)
}

const create = (
  duration: number,
  type?: LayoutAnimationType,
  property?: LayoutAnimationProperty,
): LayoutAnimationConfig => ({
  duration,
  create: { type, property },
  update: { type },
  delete: { type, property },
})

const Presets: {
  easeInEaseOut: LayoutAnimationConfig
  linear: LayoutAnimationConfig
  spring: LayoutAnimationConfig
} = {
  easeInEaseOut: create(300, 'easeInEaseOut', 'opacity'),
  linear: create(500, 'linear', 'opacity'),
  spring: {
    duration: 700,
    create: { type: 'linear', property: 'opacity' },
    update: { type: 'spring', springDamping: 0.4 },
    delete: { type: 'linear', property: 'opacity' },
  },
}

/**
 * React Native's `LayoutAnimation`: after `configureNext`, the next commit animates the layout
 * changes. An element that moves animates from its old place, and a new element animates in.
 */
export const LayoutAnimation: {
  configureNext: typeof configureNext
  create: typeof create
  Types: LayoutAnimationTypes
  Properties: LayoutAnimationProperties
  checkConfig: (...args: unknown[]) => void
  Presets: typeof Presets
  easeInEaseOut: (onAnimationDidEnd?: OnAnimationDidEndCallback) => void
  linear: (onAnimationDidEnd?: OnAnimationDidEndCallback) => void
  spring: (onAnimationDidEnd?: OnAnimationDidEndCallback) => void
  setEnabled: (value: boolean) => void
} = {
  configureNext,
  create,
  Types: Object.freeze({
    spring: 'spring',
    linear: 'linear',
    easeInEaseOut: 'easeInEaseOut',
    easeIn: 'easeIn',
    easeOut: 'easeOut',
    keyboard: 'keyboard',
  }),
  Properties: Object.freeze({
    opacity: 'opacity',
    scaleX: 'scaleX',
    scaleY: 'scaleY',
    scaleXY: 'scaleXY',
  }),
  checkConfig() {
    console.error('LayoutAnimation.checkConfig(...) has been disabled.')
  },
  Presets,
  easeInEaseOut: (onAnimationDidEnd) => configureNext(Presets.easeInEaseOut, onAnimationDidEnd),
  linear: (onAnimationDidEnd) => configureNext(Presets.linear, onAnimationDidEnd),
  spring: (onAnimationDidEnd) => configureNext(Presets.spring, onAnimationDidEnd),
  // React Native's `setEnabled` does nothing, because of a bug. Here it works.
  setEnabled(value) {
    isEnabled = value
    if (!value) cancelNextLayout()
  },
}
