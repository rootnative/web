/**
 * @license MIT
 * A port of `Libraries/Animated/AnimatedEvent.js`, and of `forkEvent` and `unforkEvent` of
 * `Libraries/Animated/AnimatedImplementation.js`, of React Native, Copyright (c) Meta Platforms,
 * Inc. and affiliates.
 */

import { findNodeHandle } from '../../compat/findNodeHandle'
import { describeScroll } from '../../components/ScrollView/describeScroll'
import type { NativeSyntheticEvent } from '../../events/types'
import { isProductionEnv } from '../../utils/env'
import { invariant } from '../../utils/invariant'
import { warnOnce } from '../../utils/warn'
import type { PlatformConfig } from './animations/Animation'
import { AnimatedValue } from './nodes/AnimatedValue'
import { AnimatedValueXY } from './nodes/AnimatedValueXY'

export type Mapping = { [key: string]: Mapping } | AnimatedValue | AnimatedValueXY

const isNumberPair = (event: unknown): boolean =>
  typeof event === 'object' &&
  event !== null &&
  'x' in event &&
  typeof event.x === 'number' &&
  'y' in event &&
  typeof event.y === 'number'

export type EventConfig<T> = {
  listener?: ((event: NativeSyntheticEvent<T>) => unknown) | undefined
  useNativeDriver: boolean
  platformConfig?: PlatformConfig | undefined
}

type Listener = (...args: unknown[]) => unknown

// Any function fits this type, so a handler with typed parameters fits too. React Native types it
// as `Function`.
type AnyHandler = (...args: never[]) => unknown

const fail = (message: string): never => {
  throw new Error(message)
}

const validate = (mapping: Mapping | null | undefined, event: unknown, key: string): void => {
  if (mapping instanceof AnimatedValue) {
    if (typeof event !== 'number') {
      fail(`Bad mapping of event key ${key}, should be number but got ${typeof event}`)
    }
    return
  }
  if (mapping instanceof AnimatedValueXY) {
    if (!isNumberPair(event)) {
      fail(`Bad mapping of event key ${key}, should be XY but got ${String(event)}`)
    }
    return
  }
  if (typeof event === 'number') {
    fail(
      `Bad mapping of type ${typeof mapping} for key ${key}, event value must map to AnimatedValue`,
    )
  }
  if (typeof mapping !== 'object') fail(`Bad mapping of type ${typeof mapping} for key ${key}`)
  if (typeof event !== 'object') fail(`Bad event of type ${typeof event} for key ${key}`)
  for (const name in mapping) {
    validate(mapping?.[name], (event as Record<string, unknown> | null)?.[name], name)
  }
}

const validateMapping = (argMapping: readonly (Mapping | null | undefined)[], args: unknown[]) => {
  if (args.length < argMapping.length) fail('Event has less arguments than mapping')
  argMapping.forEach((mapping, index) => validate(mapping, args[index], `arg${index}`))
}

const setValues = (mapping: Mapping | null | undefined, event: unknown): void => {
  if (mapping instanceof AnimatedValue) {
    if (typeof event === 'number') mapping.setValue(event)
  } else if (mapping instanceof AnimatedValueXY) {
    if (typeof event === 'object' && event !== null) {
      const { x, y } = event as Record<string, unknown>
      setValues(mapping.x, x)
      setValues(mapping.y, y)
    }
  } else if (typeof mapping === 'object' && mapping !== null) {
    for (const name in mapping) {
      setValues(mapping[name], (event as Record<string, unknown> | null)?.[name])
    }
  }
}

// Each event runs the JavaScript handler, also with `useNativeDriver: true`.
export class AnimatedEvent {
  private readonly argMapping: readonly (Mapping | null | undefined)[]
  private listeners: Listener[] = []

  constructor(argMapping: readonly (Mapping | null | undefined)[], config: EventConfig<unknown>) {
    this.argMapping = argMapping
    if (config.listener) this.__addListener(config.listener)
  }

  __addListener(callback: AnyHandler): void {
    this.listeners.push(callback as Listener)
  }

  __removeListener(callback: AnyHandler): void {
    this.listeners = this.listeners.filter((listener) => listener !== callback)
  }

  // A handler that sets each mapped value from the event, then calls the listener. In
  // development, it checks the mapping on the first event.
  __getHandler(): (...args: unknown[]) => void {
    let validated = isProductionEnv()
    return (...args) => {
      if (!validated) {
        validateMapping(this.argMapping, args)
        validated = true
      }
      this.argMapping.forEach((mapping, index) => setValues(mapping, args[index]))
      for (const listener of this.listeners) listener(...args)
    }
  }
}

const nativeEventMapping = (mapping: Mapping | null | undefined): Mapping | undefined =>
  mapping && !(mapping instanceof AnimatedValue) && !(mapping instanceof AnimatedValueXY)
    ? mapping['nativeEvent']
    : undefined

// React Native moves each value under `nativeEvent` to the native side.
const markNative = (mapping: Mapping | null | undefined): void => {
  if (mapping instanceof AnimatedValue) {
    mapping.markNative()
  } else if (mapping instanceof AnimatedValueXY) {
    mapping.x.markNative()
    mapping.y.markNative()
  } else if (typeof mapping === 'object' && mapping !== null) {
    for (const name in mapping) markNative(mapping[name])
  }
}

// React Native moves the values when the event attaches to a view. `Animated.event` returns a
// function here, which attaches to nothing, so the values move at once.
export const event = <T>(
  argMapping: readonly (Mapping | null | undefined)[],
  config: EventConfig<T>,
): ((...args: unknown[]) => void) => {
  if (config.useNativeDriver) markNative(nativeEventMapping(argMapping[0]))
  return new AnimatedEvent(argMapping, config as EventConfig<unknown>).__getHandler()
}

// Adds a listener to an event prop. `Animated.event` returns a function here, so the result is a
// function that calls the event and then the listener. An `Animated.Event` gets the listener added.
export const forkEvent = (
  handler: AnimatedEvent | AnyHandler | null | undefined,
  listener: AnyHandler,
): AnimatedEvent | AnyHandler => {
  if (!handler) return listener
  if (handler instanceof AnimatedEvent) {
    handler.__addListener(listener)
    return handler
  }
  return (...args: unknown[]) => {
    if (typeof handler === 'function') (handler as Listener)(...args)
    ;(listener as Listener)(...args)
  }
}

// Removes a listener that `forkEvent` added to an `Animated.Event`. A function from `forkEvent`
// can't lose its listener, as in React Native.
export const unforkEvent = (
  handler: AnimatedEvent | AnyHandler | null | undefined,
  listener: AnyHandler,
): void => {
  if (handler instanceof AnimatedEvent) handler.__removeListener(listener)
}

// React Native attaches the values to a native event of the view, so they change with no
// JavaScript, and it moves them to the native side. They move here too. For `onScroll`, a `scroll`
// listener on the element sets the values from the same `nativeEvent` that `ScrollView` gives its
// `onScroll`. Any other event name has no effect and warns in development. A ref with no element
// yet does nothing more, as in React Native.
export const attachNativeEvent = (
  viewRef: unknown,
  eventName: string,
  argMapping: readonly (Mapping | null | undefined)[],
  _platformConfig?: PlatformConfig | null,
): { detach: () => void } => {
  const mapping = nativeEventMapping(argMapping[0])
  invariant(
    mapping,
    'Native driven events only support animated values contained inside `nativeEvent`.',
  )
  markNative(mapping)
  if (eventName !== 'onScroll') {
    warnOnce(
      'animated-attach-native-event',
      `Animated: attachNativeEvent supports only onScroll on the web, so ${eventName} has no effect. Use Animated.event in the event prop.`,
    )
    return { detach: () => {} }
  }
  const element = findNodeHandle(viewRef)
  if (!(element instanceof HTMLElement)) return { detach: () => {} }
  const onScroll = (): void => setValues(mapping, describeScroll(element))
  element.addEventListener('scroll', onScroll, { passive: true })
  return { detach: () => element.removeEventListener('scroll', onScroll) }
}
