import { resolveStyle } from '../../../style/resolveStyle'
import type { AnimatedProps } from '../nodes/AnimatedProps'
import { withValues } from '../nodes/AnimatedValue'
import type { AnimatedValue } from '../nodes/AnimatedValue'
import { sampleTimes } from './curve'
import type { Curve } from './curve'

// The CSS properties that a browser can animate on its compositor thread.
export type CompositorProperty = 'transform' | 'opacity'

export type ValueCurve = Readonly<{ value: AnimatedValue; curve: Curve }>

// At each sample time, each value takes the value of its curve, and the whole style of the leaf
// resolves, as a frame of the JavaScript driver writes it. So `interpolate` and the math nodes give
// the same output on both drivers.
export const buildKeyframes = (
  leaf: AnimatedProps,
  staticStyle: unknown,
  properties: readonly CompositorProperty[],
  curves: readonly ValueCurve[],
  duration: number,
): Keyframe[] => {
  const times = sampleTimes(duration)
  const last = times.length - 1
  const values = new Map<AnimatedValue, number>()
  return times.map((time, index) => {
    for (const { value, curve } of curves) values.set(value, curve.valueAt(time))
    const css = withValues(values, () => resolveStyle(leaf.styleWithStaticStyle(staticStyle) ?? {}))
    const keyframe: Keyframe = { offset: index / last }
    for (const property of properties) {
      const value = css[property]
      if (value !== undefined) keyframe[property] = value
    }
    return keyframe
  })
}
