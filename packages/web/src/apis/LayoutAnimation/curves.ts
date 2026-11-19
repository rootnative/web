/**
 * @license MIT
 * The progress curves of `ReactCommon/react/renderer/animations/utils.cpp` of React Native,
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 */

import type { LayoutAnimationType } from './types'

type Curve = (t: number, springDamping: number) => number

// `t` goes from 0 to 1. `keyboard` falls back to `linear` in React Native too.
const curves: Record<LayoutAnimationType, Curve> = {
  linear: (t) => t,
  keyboard: (t) => t,
  easeIn: (t) => t ** 2,
  easeOut: (t) => 1 - (1 - t) ** 2,
  easeInEaseOut: (t) => Math.cos((t + 1) * Math.PI) / 2 + 0.5,
  spring: (t, d) => 1 + 2 ** (-10 * t) * Math.sin(((t - d / 4) * Math.PI * 2) / d),
}

const SAMPLES = 60

const round = (value: number): number => Math.round(value * 10000) / 10000

/**
 * The curve as a CSS `linear()` easing. The last point is 1, because React Native ends each
 * animation at its end value, also where the spring curve ends a little off it. A spring with a
 * damping of 0 gives no number, so it falls back to `linear`.
 */
export const easingFor = (type: LayoutAnimationType, springDamping: number): string => {
  if (type === 'linear' || type === 'keyboard') return 'linear'
  const curve = curves[type]
  const points: number[] = []
  for (let i = 0; i < SAMPLES; i++) {
    const point = curve(i / SAMPLES, springDamping)
    if (!Number.isFinite(point)) return 'linear'
    points.push(round(point))
  }
  points.push(1)
  return `linear(${points.join(', ')})`
}
