import { Text as BaseText } from '../../components/Text'
import type { TextInstance, TextProps } from '../../components/Text'
import { View as BaseView } from '../../components/View'
import type { ViewInstance, ViewProps } from '../../components/View'
import { createAnimatedComponent } from './createAnimatedComponent'
import type { AnimatedComponentType } from './createAnimatedComponent'
import type { AnimatedInterpolation } from './nodes/AnimatedInterpolation'
import type { AnimatedValue } from './nodes/AnimatedValue'

export { AnimatedEvent as Event, event } from './AnimatedEvent'
export { parallel, spring, timing } from './AnimatedImplementation'
export type {
  CompositeAnimation,
  SpringAnimationConfig,
  TimingAnimationConfig,
} from './AnimatedImplementation'
export { createAnimatedComponent } from './createAnimatedComponent'
export type {
  AnimatedComponentType as AnimatedComponent,
  AnimatedProps,
  WithAnimatedValue,
} from './createAnimatedComponent'
export { add } from './nodes/AnimatedAddition'
export type { AnimatedAddition } from './nodes/AnimatedAddition'
export { AnimatedInterpolation as Interpolation } from './nodes/AnimatedInterpolation'
export type {
  AnimatedInterpolation,
  InterpolationConfigType as InterpolationConfig,
} from './nodes/AnimatedInterpolation'
export { multiply } from './nodes/AnimatedMultiplication'
export type { AnimatedMultiplication } from './nodes/AnimatedMultiplication'
export { AnimatedNode as Node } from './nodes/AnimatedNode'
export type { AnimatedNode } from './nodes/AnimatedNode'
export { AnimatedValue as Value } from './nodes/AnimatedValue'
export type { AnimatedValueConfig as AnimatedConfig } from './nodes/AnimatedValue'

export type Numeric = AnimatedInterpolation<number> | AnimatedValue

export const View: AnimatedComponentType<ViewProps, ViewInstance> =
  /* @__PURE__ */ createAnimatedComponent(BaseView)

export const Text: AnimatedComponentType<TextProps, TextInstance> =
  /* @__PURE__ */ createAnimatedComponent(BaseText)
