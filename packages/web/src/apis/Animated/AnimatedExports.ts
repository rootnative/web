import { Text as BaseText } from '../../components/Text'
import type { TextInstance, TextProps } from '../../components/Text'
import { View as BaseView } from '../../components/View'
import type { ViewInstance, ViewProps } from '../../components/View'
import { createAnimatedComponent } from './createAnimatedComponent'
import type { AnimatedComponentType } from './createAnimatedComponent'
import type { AnimatedAddition } from './nodes/AnimatedAddition'
import type { AnimatedDiffClamp } from './nodes/AnimatedDiffClamp'
import type { AnimatedDivision } from './nodes/AnimatedDivision'
import type { AnimatedInterpolation } from './nodes/AnimatedInterpolation'
import type { AnimatedModulo } from './nodes/AnimatedModulo'
import type { AnimatedMultiplication } from './nodes/AnimatedMultiplication'
import type { AnimatedSubtraction } from './nodes/AnimatedSubtraction'
import type { AnimatedValue } from './nodes/AnimatedValue'

export { AnimatedEvent as Event, event } from './AnimatedEvent'
export {
  decay,
  delay,
  loop,
  parallel,
  sequence,
  spring,
  stagger,
  timing,
} from './AnimatedImplementation'
export type {
  CompositeAnimation,
  DecayAnimationConfig,
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
export { AnimatedColor as Color } from './nodes/AnimatedColor'
export type { AnimatedColor } from './nodes/AnimatedColor'
export { diffClamp } from './nodes/AnimatedDiffClamp'
export type { AnimatedDiffClamp } from './nodes/AnimatedDiffClamp'
export { divide } from './nodes/AnimatedDivision'
export type { AnimatedDivision } from './nodes/AnimatedDivision'
export { AnimatedInterpolation as Interpolation } from './nodes/AnimatedInterpolation'
export type {
  AnimatedInterpolation,
  InterpolationConfigType as InterpolationConfig,
} from './nodes/AnimatedInterpolation'
export { modulo } from './nodes/AnimatedModulo'
export type { AnimatedModulo } from './nodes/AnimatedModulo'
export { multiply } from './nodes/AnimatedMultiplication'
export type { AnimatedMultiplication } from './nodes/AnimatedMultiplication'
export { AnimatedNode as Node } from './nodes/AnimatedNode'
export type { AnimatedNode } from './nodes/AnimatedNode'
export { subtract } from './nodes/AnimatedSubtraction'
export type { AnimatedSubtraction } from './nodes/AnimatedSubtraction'
export { AnimatedValue as Value } from './nodes/AnimatedValue'
export type { AnimatedValueConfig as AnimatedConfig } from './nodes/AnimatedValue'
export { AnimatedValueXY as ValueXY } from './nodes/AnimatedValueXY'

export type Numeric =
  | AnimatedAddition
  | AnimatedDiffClamp
  | AnimatedDivision
  | AnimatedInterpolation<number>
  | AnimatedModulo
  | AnimatedMultiplication
  | AnimatedSubtraction
  | AnimatedValue

export const View: AnimatedComponentType<ViewProps, ViewInstance> =
  /* @__PURE__ */ createAnimatedComponent(BaseView)

export const Text: AnimatedComponentType<TextProps, TextInstance> =
  /* @__PURE__ */ createAnimatedComponent(BaseText)
