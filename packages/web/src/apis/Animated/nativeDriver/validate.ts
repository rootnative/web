/**
 * @license MIT
 * The lists and messages of `Libraries/Animated/NativeAnimatedAllowlist.js` and
 * `src/private/animated/NativeAnimatedValidation.js` of React Native, Copyright (c) Meta Platforms,
 * Inc. and affiliates.
 */

import { isProductionEnv } from '../../../utils/env'
import { AnimatedInterpolation } from '../nodes/AnimatedInterpolation'
import type { AnimatedNode } from '../nodes/AnimatedNode'
import { AnimatedStyle } from '../nodes/AnimatedStyle'
import { AnimatedTransform } from '../nodes/AnimatedTransform'

// React Native 0.88.1 with its default flags: no layout keys (`useSharedAnimatedBackend`) and no
// `matrix` (`shouldUseAnimatedObjectForTransform`).
const SUPPORTED_STYLES = new Set([
  'backgroundColor',
  'borderBottomColor',
  'borderColor',
  'borderEndColor',
  'borderLeftColor',
  'borderRightColor',
  'borderStartColor',
  'borderTopColor',
  'color',
  'tintColor',
  'borderBottomEndRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderBottomStartRadius',
  'borderEndEndRadius',
  'borderEndStartRadius',
  'borderRadius',
  'borderTopEndRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderTopStartRadius',
  'borderStartEndRadius',
  'borderStartStartRadius',
  'elevation',
  'opacity',
  'filter',
  'transform',
  'zIndex',
  'shadowOpacity',
  'shadowRadius',
  'scaleX',
  'scaleY',
  'translateX',
  'translateY',
])

const SUPPORTED_TRANSFORMS = new Set([
  'translateX',
  'translateY',
  'scale',
  'scaleX',
  'scaleY',
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'perspective',
  'skewX',
  'skewY',
])

const SUPPORTED_INTERPOLATION_PARAMS = new Set([
  'inputRange',
  'outputRange',
  'extrapolate',
  'extrapolateRight',
  'extrapolateLeft',
  'easing',
  'debugID',
])

const unsupported = (node: AnimatedNode): string[] => {
  if (node instanceof AnimatedStyle) {
    return node
      .animatedKeys()
      .filter((key) => !SUPPORTED_STYLES.has(key))
      .map((key) => `Style property '${key}' is not supported by native animated module`)
  }
  if (node instanceof AnimatedTransform) {
    return node
      .properties()
      .filter((property) => !SUPPORTED_TRANSFORMS.has(property))
      .map((property) => `Property '${property}' is not supported by native animated module`)
  }
  if (node instanceof AnimatedInterpolation) {
    return node
      .configKeys()
      .filter((key) => !SUPPORTED_INTERPOLATION_PARAMS.has(key))
      .map((key) => `Interpolation property '${key}' is not supported by native animated module`)
  }
  return []
}

const checked = new WeakSet<AnimatedNode>()

// In development, logs the errors that React Native logs for a node under a value that an animation
// with `useNativeDriver: true` moves. On native, such a node doesn't animate. React Native checks
// a node once, when it moves to the native side.
export const checkNativeGraph = (value: AnimatedNode): void => {
  if (isProductionEnv()) return
  // A checked node can get new children, such as the style of a new render.
  const visit = (node: AnimatedNode): void => {
    if (!checked.has(node)) {
      checked.add(node)
      for (const message of unsupported(node)) console.error(message)
    }
    for (const child of node.__getChildren()) visit(child)
  }
  for (const child of value.__getChildren()) visit(child)
}
