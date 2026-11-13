import { getStyleRegistry, type StyleRegistry } from './registry'
import { resolveStyle } from './resolveStyle'
import type { FlatStyle, StyleProp } from './types'

export const flattenStyle = <T extends object>(style: StyleProp<T>): T | undefined => {
  if (style === null || style === undefined || style === false || style === '') return undefined
  if (!Array.isArray(style)) return style as T

  let result: object | undefined
  for (const entry of style as ReadonlyArray<StyleProp<T>>) {
    const flat = flattenStyle(entry)
    if (flat === undefined) continue
    result = result === undefined ? { ...flat } : Object.assign(result, flat)
  }
  return result as T | undefined
}

const cache = new WeakMap<StyleRegistry, WeakMap<FlatStyle, string>>()

export const compileStyle = (
  style: StyleProp<object>,
  registry: StyleRegistry = getStyleRegistry(),
): string => {
  const flat = flattenStyle(style) as FlatStyle | undefined
  if (flat === undefined) return ''

  // Static objects from StyleSheet.create are frozen, so they can be cached by identity.
  const cacheable = Object.isFrozen(flat)
  let perRegistry = cache.get(registry)
  if (cacheable) {
    const cached = perRegistry?.get(flat)
    if (cached !== undefined) return cached
  }

  const classes = registry.classesFor(resolveStyle(flat))
  if (cacheable) {
    if (perRegistry === undefined) {
      perRegistry = new WeakMap()
      cache.set(registry, perRegistry)
    }
    perRegistry.set(flat, classes)
  }
  return classes
}

/**
 * The class of a component's default style, in the reset sheet. Any style of the app beats it,
 * as any style beats the defaults of native layout.
 */
export const compileReset = (
  className: string,
  style: FlatStyle,
  registry: StyleRegistry = getStyleRegistry(),
): string => registry.resetClass(className, resolveStyle(style))

// Joins class names and skips the empty ones.
export const joinClassNames = (...names: ReadonlyArray<string | false | undefined>): string =>
  names.filter((name) => typeof name === 'string' && name !== '').join(' ')
