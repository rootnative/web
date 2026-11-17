import { bezier } from './bezier'

export type EasingFunction = (t: number) => number

let ease: EasingFunction | undefined

export const Easing: {
  step0: (n: number) => number
  step1: (n: number) => number
  linear: (t: number) => number
  ease: (t: number) => number
  quad: (t: number) => number
  cubic: (t: number) => number
  poly: (n: number) => EasingFunction
  sin: (t: number) => number
  circle: (t: number) => number
  exp: (t: number) => number
  elastic: (bounciness?: number) => EasingFunction
  back: (s?: number) => EasingFunction
  bounce: (t: number) => number
  bezier: (x1: number, y1: number, x2: number, y2: number) => EasingFunction
  in: (easing: EasingFunction) => EasingFunction
  out: (easing: EasingFunction) => EasingFunction
  inOut: (easing: EasingFunction) => EasingFunction
} = {
  step0: (n) => (n > 0 ? 1 : 0),

  step1: (n) => (n >= 1 ? 1 : 0),

  linear: (t) => t,

  // React Native's curve, which is CSS `ease-in`, not CSS `ease`. Made on the first use, so an
  // import costs nothing.
  ease: (t) => {
    ease ??= bezier(0.42, 0, 1, 1)
    return ease(t)
  },

  quad: (t) => t * t,

  cubic: (t) => t * t * t,

  poly: (n) => (t) => Math.pow(t, n),

  sin: (t) => 1 - Math.cos((t * Math.PI) / 2),

  circle: (t) => 1 - Math.sqrt(1 - t * t),

  exp: (t) => Math.pow(2, 10 * (t - 1)),

  elastic: (bounciness = 1) => {
    const p = bounciness * Math.PI
    return (t) => 1 - Math.pow(Math.cos((t * Math.PI) / 2), 3) * Math.cos(t * p)
  },

  back:
    (s = 1.70158) =>
    (t) =>
      t * t * ((s + 1) * t - s),

  bounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t
    if (t < 2 / 2.75) {
      const t2 = t - 1.5 / 2.75
      return 7.5625 * t2 * t2 + 0.75
    }
    if (t < 2.5 / 2.75) {
      const t2 = t - 2.25 / 2.75
      return 7.5625 * t2 * t2 + 0.9375
    }
    const t2 = t - 2.625 / 2.75
    return 7.5625 * t2 * t2 + 0.984375
  },

  bezier,

  in: (easing) => easing,

  out: (easing) => (t) => 1 - easing(1 - t),

  inOut: (easing) => (t) => (t < 0.5 ? easing(t * 2) / 2 : 1 - easing((1 - t) * 2) / 2),
}
