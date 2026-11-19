/**
 * @license MIT
 * A port of `useAnimatedValue.js`, `useAnimatedValueXY.js`, and `useAnimatedColor.js` of
 * `Libraries/Animated` of React Native, Copyright (c) Meta Platforms, Inc. and affiliates.
 */

import { useState } from 'react'

import { AnimatedColor } from './nodes/AnimatedColor'
import type { AnimatedColorConfig, InputValue } from './nodes/AnimatedColor'
import { AnimatedValue } from './nodes/AnimatedValue'
import type { AnimatedValueConfig } from './nodes/AnimatedValue'
import { AnimatedValueXY } from './nodes/AnimatedValueXY'

// Each hook makes its value on the first render and returns the same value after that. Later
// arguments have no effect, as in React Native.

export const useAnimatedValue = (
  initialValue: number,
  config?: AnimatedValueConfig | null,
): AnimatedValue => useState(() => new AnimatedValue(initialValue, config))[0]

export const useAnimatedValueXY = (
  initialValue: { x: number; y: number },
  config?: AnimatedValueConfig | null,
): AnimatedValueXY => useState(() => new AnimatedValueXY(initialValue, config))[0]

export const useAnimatedColor = (
  inputValue?: InputValue,
  config?: AnimatedColorConfig | null,
): AnimatedColor => useState(() => new AnimatedColor(inputValue, config))[0]
