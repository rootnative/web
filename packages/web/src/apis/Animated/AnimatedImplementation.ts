/**
 * @license MIT
 * A port of the animations and composites of `Libraries/Animated/AnimatedImplementation.js` of
 * React Native, Copyright (c) Meta Platforms, Inc. and affiliates.
 */

import { isMotionReduced } from './animations/Animation'
import type { Animation, AnimationConfig, EndCallback, EndResult } from './animations/Animation'
import { DecayAnimation } from './animations/DecayAnimation'
import type { DecayAnimationConfigSingle } from './animations/DecayAnimation'
import { SpringAnimation } from './animations/SpringAnimation'
import type { SpringAnimationConfigSingle } from './animations/SpringAnimation'
import { TimingAnimation } from './animations/TimingAnimation'
import type { TimingAnimationConfigSingle } from './animations/TimingAnimation'
import type { AnimatedColor, RgbaValue } from './nodes/AnimatedColor'
import type { AnimatedInterpolation } from './nodes/AnimatedInterpolation'
import { AnimatedNode } from './nodes/AnimatedNode'
import { AnimatedTracking } from './nodes/AnimatedTracking'
import { AnimatedValue } from './nodes/AnimatedValue'
import { AnimatedValueXY } from './nodes/AnimatedValueXY'

export type CompositeAnimation = {
  start: (callback?: EndCallback | undefined, isLooping?: boolean) => void
  stop: () => void
  reset: () => void
}

type XY = Readonly<{ x: number; y: number }>

type AnimatedTarget = AnimatedValue | AnimatedValueXY | AnimatedColor

// A number, or a node that the value follows. `{ x, y }` and a `ValueXY` are for a `ValueXY`, and
// `{ r, g, b, a }` and a `Color` are for a `Color`.
type ToValue =
  | number
  | AnimatedValue
  | XY
  | AnimatedValueXY
  | RgbaValue
  | AnimatedColor
  | AnimatedInterpolation<number>

export type TimingAnimationConfig = Readonly<
  Omit<TimingAnimationConfigSingle, 'toValue'> & { toValue: ToValue }
>
export type SpringAnimationConfig = Readonly<
  Omit<SpringAnimationConfigSingle, 'toValue' | 'velocity'> & {
    toValue: ToValue
    velocity?: number | XY | undefined
  }
>
export type DecayAnimationConfig = Readonly<
  Omit<DecayAnimationConfigSingle, 'velocity'> & { velocity: number | XY }
>

export type ParallelConfig = { stopTogether?: boolean | undefined }

export type LoopAnimationConfig = {
  iterations: number
  resetBeforeIteration?: boolean | undefined
}

const combineCallbacks = (
  callback: EndCallback | undefined,
  config: AnimationConfig,
): EndCallback | undefined => {
  const { onComplete } = config
  if (callback && onComplete) {
    return (result) => {
      onComplete(result)
      callback(result)
    }
  }
  return callback ?? onComplete
}

// A node as `toValue` makes the value follow it: each change of the node starts a new animation.
const animateTo = (
  value: AnimatedValue,
  toValue: unknown,
  makeAnimation: (toValue: number) => Animation,
  callback: EndCallback | undefined,
): void => {
  if (typeof toValue !== 'number' && !(toValue instanceof AnimatedNode)) {
    throw new Error(
      'Animated: toValue must be a number or an Animated node. An object of numbers, such as { x, y }, needs an Animated.ValueXY or an Animated.Color.',
    )
  }
  value.stopTracking()
  if (typeof toValue === 'number') value.animate(makeAnimation(toValue), callback)
  else value.track(new AnimatedTracking(value, toValue, makeAnimation, callback))
}

// React Native gives NaN frames here. A `ValueXY` splits `{ x, y }` before this point.
const singleVelocity = (velocity: number | XY): number => {
  if (typeof velocity !== 'number') {
    throw new Error('Animated: a velocity of { x, y } needs an Animated.ValueXY.')
  }
  return velocity
}

const channelsOf = (value: AnimatedValueXY | AnimatedColor): [string, AnimatedValue][] =>
  value instanceof AnimatedValueXY
    ? [
        ['x', value.x],
        ['y', value.y],
      ]
    : [
        ['r', value.r],
        ['g', value.g],
        ['b', value.b],
        ['a', value.a],
      ]

// The config of one channel. A key with a part for each channel, such as `toValue: { x, y }` or
// `toValue: someValueXY`, gives the channel its part. Any other key stays as it is.
const channelConfig = <Config extends object>(
  config: Config,
  channel: string,
  channels: readonly string[],
): Config => {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(config)) {
    const parts = typeof value === 'object' && value !== null ? value : {}
    result[key] = channels.every((name) => parts[name] !== undefined) ? parts[channel] : value
  }
  return result as Config
}

// A `ValueXY` or a `Color` runs one animation for each channel. The `parallel` has
// `stopTogether: false`, as in React Native, so a channel that tracks a node doesn't stop the
// others.
const vectorAnimation = <Config extends object>(
  value: AnimatedValueXY | AnimatedColor,
  config: Config,
  animate: (value: AnimatedValue, config: Config) => CompositeAnimation,
): CompositeAnimation => {
  const channels = channelsOf(value)
  const names = channels.map(([name]) => name)
  return parallel(
    channels.map(([name, channel]) => animate(channel, channelConfig(config, name, names))),
    { stopTogether: false },
  )
}

export const timing = (
  value: AnimatedTarget,
  config: TimingAnimationConfig,
): CompositeAnimation => {
  if (!(value instanceof AnimatedValue)) return vectorAnimation(value, config, timing)
  return {
    start: (callback) => {
      animateTo(
        value,
        config.toValue,
        (toValue) => new TimingAnimation({ ...config, toValue }),
        combineCallbacks(callback, config),
      )
    },
    stop: () => value.stopAnimation(),
    reset: () => value.resetAnimation(),
  }
}

export const spring = (
  value: AnimatedTarget,
  config: SpringAnimationConfig,
): CompositeAnimation => {
  if (!(value instanceof AnimatedValue)) return vectorAnimation(value, config, spring)
  return {
    start: (callback) => {
      const velocity = config.velocity === undefined ? undefined : singleVelocity(config.velocity)
      animateTo(
        value,
        config.toValue,
        (toValue) => new SpringAnimation({ ...config, toValue, velocity }),
        combineCallbacks(callback, config),
      )
    },
    stop: () => value.stopAnimation(),
    reset: () => value.resetAnimation(),
  }
}

export const decay = (value: AnimatedTarget, config: DecayAnimationConfig): CompositeAnimation => {
  if (!(value instanceof AnimatedValue)) return vectorAnimation(value, config, decay)
  return {
    start: (callback) => {
      const velocity = singleVelocity(config.velocity)
      value.stopTracking()
      value.animate(new DecayAnimation({ ...config, velocity }), combineCallbacks(callback, config))
    },
    stop: () => value.stopAnimation(),
    reset: () => value.resetAnimation(),
  }
}

// Starts each animation when the one before it ends. One that stops early ends the sequence with
// `finished: false`, and the next ones don't start.
export const sequence = (animations: CompositeAnimation[]): CompositeAnimation => {
  let current = 0
  return {
    start: (callback, isLooping) => {
      // A hole in the list ends at once, as in `parallel`.
      const startCurrent = (): void => {
        const animation = animations[current]
        if (animation) animation.start(onComplete, isLooping)
        else onComplete({ finished: true })
      }
      const onComplete = (result: EndResult): void => {
        if (!result.finished) {
          callback?.(result)
          return
        }
        current++
        if (current === animations.length) {
          // The next start begins at the first animation, also with no reset.
          current = 0
          callback?.(result)
          return
        }
        startCurrent()
      }
      if (animations.length === 0) callback?.({ finished: true })
      else startCurrent()
    },
    stop: () => {
      animations[current]?.stop()
    },
    reset: () => {
      animations.forEach((animation, index) => {
        if (index <= current) animation.reset()
      })
      current = 0
    },
  }
}

// Starts each animation at once. With `stopTogether` (the default), the first one that stops
// early stops the rest. The callback runs once, when the last one ends, with its result.
export const parallel = (
  animations: CompositeAnimation[],
  config?: ParallelConfig | null,
): CompositeAnimation => {
  let doneCount = 0
  const hasEnded: boolean[] = []
  const stopTogether = config?.stopTogether !== false

  const result: CompositeAnimation = {
    start: (callback, isLooping) => {
      if (doneCount === animations.length) {
        callback?.({ finished: true })
        return
      }
      animations.forEach((animation, index) => {
        const onEnd = (endResult: EndResult): void => {
          hasEnded[index] = true
          doneCount++
          if (doneCount === animations.length) {
            doneCount = 0
            callback?.(endResult)
            return
          }
          if (!endResult.finished && stopTogether) result.stop()
        }
        // React Native allows a hole in the list, so a `.map()` can return null for a route.
        if (animation) animation.start(onEnd, isLooping)
        else onEnd({ finished: true })
      })
    },
    stop: () => {
      animations.forEach((animation, index) => {
        if (!hasEnded[index]) animation.stop()
        hasEnded[index] = true
      })
    },
    reset: () => {
      animations.forEach((animation, index) => {
        animation.reset()
        hasEnded[index] = false
        doneCount = 0
      })
    },
  }
  return result
}

export const delay = (time: number): CompositeAnimation =>
  timing(new AnimatedValue(0), { toValue: 0, delay: time, duration: 0, useNativeDriver: false })

// Starts animation `i` after `time * i` milliseconds, as a `parallel` of `sequence`s.
export const stagger = (time: number, animations: CompositeAnimation[]): CompositeAnimation =>
  parallel(animations.map((animation, index) => sequence([delay(time * index), animation])))

// Runs the animation `iterations` times, or until `stop()` with -1 (the default). With reduced
// motion, the loop ends after one iteration: its animations end at once, so an endless loop of them
// would never give control back.
export const loop = (
  animation: CompositeAnimation,
  config?: LoopAnimationConfig,
): CompositeAnimation => {
  const iterations = config?.iterations ?? -1
  const resetBeforeIteration = config?.resetBeforeIteration ?? true
  let isFinished = false
  let iterationsSoFar = 0
  return {
    start: (callback) => {
      const restart = (result: EndResult = { finished: true }): void => {
        if (
          isFinished ||
          iterationsSoFar === iterations ||
          !result.finished ||
          (iterationsSoFar > 0 && isMotionReduced())
        ) {
          callback?.(result)
          return
        }
        iterationsSoFar++
        if (resetBeforeIteration) animation.reset()
        animation.start(restart, iterations === -1)
      }
      if (!animation || iterations === 0) callback?.({ finished: true })
      else restart()
    },
    stop: () => {
      isFinished = true
      animation.stop()
    },
    reset: () => {
      iterationsSoFar = 0
      isFinished = false
      animation.reset()
    },
  }
}
