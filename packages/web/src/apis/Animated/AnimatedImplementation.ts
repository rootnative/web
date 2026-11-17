/**
 * @license MIT
 * A port of `timing`, `spring`, and `parallel` from `Libraries/Animated/AnimatedImplementation.js`
 * of React Native, Copyright (c) Meta Platforms, Inc. and affiliates.
 */

import type { AnimationConfig, EndCallback, EndResult } from './animations/Animation'
import { SpringAnimation } from './animations/SpringAnimation'
import type { SpringAnimationConfigSingle } from './animations/SpringAnimation'
import { TimingAnimation } from './animations/TimingAnimation'
import type { TimingAnimationConfigSingle } from './animations/TimingAnimation'
import type { AnimatedValue } from './nodes/AnimatedValue'

export type CompositeAnimation = {
  start: (callback?: EndCallback | undefined, isLooping?: boolean) => void
  stop: () => void
  reset: () => void
}

// Only a number for now. React Native also takes an `Animated` node, a `ValueXY`, and a color.
export type TimingAnimationConfig = TimingAnimationConfigSingle
export type SpringAnimationConfig = SpringAnimationConfigSingle

export type ParallelConfig = { stopTogether?: boolean | undefined }

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

const checkToValue = (config: { toValue: unknown }): void => {
  if (typeof config.toValue !== 'number') {
    throw new Error(
      'Animated: a toValue that is not a number is not in @rootnative/web yet. See https://rootnative.github.io/web/status.',
    )
  }
}

export const timing = (
  value: AnimatedValue,
  config: TimingAnimationConfig,
): CompositeAnimation => ({
  start: (callback) => {
    checkToValue(config)
    value.animate(new TimingAnimation(config), combineCallbacks(callback, config))
  },
  stop: () => value.stopAnimation(),
  reset: () => value.resetAnimation(),
})

export const spring = (
  value: AnimatedValue,
  config: SpringAnimationConfig,
): CompositeAnimation => ({
  start: (callback) => {
    checkToValue(config)
    value.animate(new SpringAnimation(config), combineCallbacks(callback, config))
  },
  stop: () => value.stopAnimation(),
  reset: () => value.resetAnimation(),
})

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
