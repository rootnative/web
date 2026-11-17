/**
 * @license MIT
 * A port of `Libraries/Animated/createAnimatedComponent.js` of React Native, Copyright (c) Meta
 * Platforms, Inc. and affiliates.
 */

import {
  useCallback,
  useImperativeHandle,
  useRef,
  type ComponentType,
  type ReactNode,
  type Ref,
} from 'react'

import type { ViewProps } from '../../components/View/types'
import type { NativeColorValue } from '../StyleSheet/types'
import type { AnimatedAddition } from './nodes/AnimatedAddition'
import type { AnimatedInterpolation } from './nodes/AnimatedInterpolation'
import type { AnimatedMultiplication } from './nodes/AnimatedMultiplication'
import type { AnimatedNode } from './nodes/AnimatedNode'
import type { AnimatedValue } from './nodes/AnimatedValue'
import { useAnimatedProps } from './useAnimatedProps'

type Nullable = void | null
type Primitive = string | number | boolean | symbol | void
type Builtin = (...args: readonly never[]) => unknown | Date | Error | RegExp

export type WithAnimatedValue<T> = T extends Builtin | Nullable
  ? T
  : T extends Primitive
    ? | T
      | AnimatedNode
      | AnimatedAddition
      | AnimatedMultiplication
      | AnimatedValue
      | AnimatedInterpolation<number | string>
      | AnimatedInterpolation<number>
      | AnimatedInterpolation<string>
      | AnimatedInterpolation<NativeColorValue>
    : T extends ReadonlyArray<infer P>
      ? ReadonlyArray<WithAnimatedValue<P>>
      : T extends object
        ? { readonly [K in keyof T]: WithAnimatedValue<T[K]> }
        : T

type NonAnimatedProps =
  'ref' | 'innerViewRef' | 'scrollViewRef' | 'testID' | 'disabled' | 'accessibilityLabel'

type PassThroughProps = Readonly<{
  passthroughAnimatedPropExplicitValues?: ViewProps | null | undefined
}>

type LooseOmit<O extends object, K extends PropertyKey> = Pick<O, Exclude<keyof O, K>>

export type AnimatedProps<Props extends object> = LooseOmit<
  { [K in keyof Props]: K extends NonAnimatedProps ? Props[K] : WithAnimatedValue<Props[K]> },
  'ref'
> &
  PassThroughProps

export type AnimatedComponentType<Props extends object, Instance = unknown> = (
  props: Omit<AnimatedProps<Props>, 'ref'> & { ref?: Ref<Instance> | undefined },
) => ReactNode

// The instance that the `ref` prop of a component gives.
type InstanceOf<Props> = Props extends { ref?: Ref<infer Instance> | undefined }
  ? Instance
  : unknown

const composeStyles = (style: unknown, passthrough: unknown): unknown => {
  if (passthrough === null || passthrough === undefined) return style
  if (style === null || style === undefined) return passthrough
  return [style, passthrough]
}

export function createAnimatedComponent<Props extends object>(
  Component: ComponentType<Props>,
): AnimatedComponentType<Props, InstanceOf<Props>> {
  function AnimatedComponent(props: Readonly<Record<string, unknown>>): ReactNode {
    const Base = Component as unknown as ComponentType<Record<string, unknown>>
    const { ref: forwardedRef, ...rest } = props
    const [reducedProps, animatedRef] = useAnimatedProps<unknown>(rest)

    // The `ref` prop gets the instance of the inner component.
    const instance = useRef<unknown>(null)
    useImperativeHandle(forwardedRef as Ref<unknown> | undefined, () => instance.current, [])
    const ref = useCallback(
      (current: unknown) => {
        instance.current = current
        const cleanUp = animatedRef(current)
        return () => {
          instance.current = null
          if (typeof cleanUp === 'function') cleanUp()
        }
      },
      [animatedRef],
    )

    const { passthroughAnimatedPropExplicitValues: passthrough, ...componentProps } =
      reducedProps as Record<string, unknown> & {
        passthroughAnimatedPropExplicitValues?: ViewProps | null
      }
    return (
      <Base
        {...componentProps}
        {...passthrough}
        style={composeStyles(componentProps['style'], passthrough?.style)}
        ref={ref}
      />
    )
  }
  AnimatedComponent.displayName = `Animated(${Component.displayName || Component.name || 'Anonymous'})`

  return AnimatedComponent as unknown as AnimatedComponentType<Props, InstanceOf<Props>>
}
