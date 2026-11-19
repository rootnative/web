/**
 * @license MIT
 * A port of `Libraries/LayoutAnimation/LayoutAnimation.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import { hasDOM } from '../../utils/env'

export type LayoutAnimationType =
  'spring' | 'linear' | 'easeInEaseOut' | 'easeIn' | 'easeOut' | 'keyboard'

export type LayoutAnimationProperty = 'opacity' | 'scaleX' | 'scaleY' | 'scaleXY'

export type LayoutAnimationAnimationConfig = Readonly<{
  duration?: number | undefined
  delay?: number | undefined
  springDamping?: number | undefined
  initialVelocity?: number | undefined
  type?: LayoutAnimationType | undefined
  property?: LayoutAnimationProperty | undefined
}>

export type LayoutAnimationAnim = LayoutAnimationAnimationConfig

export type LayoutAnimationConfig = Readonly<{
  duration: number
  create?: LayoutAnimationAnimationConfig | undefined
  update?: LayoutAnimationAnimationConfig | undefined
  delete?: LayoutAnimationAnimationConfig | undefined
}>

export type LayoutAnimationTypes = Readonly<{ [type in LayoutAnimationType]: type }>

export type LayoutAnimationProperties = Readonly<{ [prop in LayoutAnimationProperty]: prop }>

type OnAnimationDidEndCallback = () => void
type OnAnimationDidFailCallback = () => void

// Nothing animates yet: the next layout shows at once. The callback runs once, one frame and 1 ms
// after the duration, as React Native's JavaScript side calls it when the native side doesn't.
// React Native never calls `onAnimationDidFail` for a valid config.
const configureNext = (
  config: LayoutAnimationConfig,
  onAnimationDidEnd?: OnAnimationDidEndCallback,
  _onAnimationDidFail?: OnAnimationDidFailCallback,
): void => {
  if (!hasDOM()) return
  setTimeout(() => onAnimationDidEnd?.(), (config.duration ?? 0) + 17)
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
 * React Native's `LayoutAnimation`: the next commit animates the layout changes. On the web,
 * nothing animates yet. `configureNext` calls `onAnimationDidEnd` after the duration.
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
  // Nothing animates yet, so there is nothing to turn off.
  setEnabled() {},
}
