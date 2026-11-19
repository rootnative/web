/**
 * @license MIT
 * A port of `Libraries/Animated/AnimatedEvent.js` of React Native, Copyright (c) Meta Platforms,
 * Inc. and affiliates.
 */

import type { NativeSyntheticEvent } from '../../events/types'
import { isProductionEnv } from '../../utils/env'
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

// The web has no native driver, so each event runs the JavaScript handler, also with
// `useNativeDriver: true`.
export class AnimatedEvent {
  private readonly argMapping: readonly (Mapping | null | undefined)[]
  private readonly listeners: Listener[] = []

  constructor(argMapping: readonly (Mapping | null | undefined)[], config: EventConfig<unknown>) {
    this.argMapping = argMapping
    if (config.listener) this.listeners.push(config.listener as Listener)
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

export const event = <T>(
  argMapping: readonly (Mapping | null | undefined)[],
  config: EventConfig<T>,
): ((...args: unknown[]) => void) =>
  new AnimatedEvent(argMapping, config as EventConfig<unknown>).__getHandler()
