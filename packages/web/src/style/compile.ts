import { getStyleRegistry, type StyleRegistry } from './registry'
import { resolveStyle } from './resolveStyle'
import type { FlatStyle, StyleProp } from './types'

export const flattenStyle = <T extends FlatStyle>(style: StyleProp<T>): T | undefined => {
  if (style === null || style === undefined || style === false || style === '') return undefined
  if (!Array.isArray(style)) return style as T

  let result: Record<string, unknown> | undefined
  for (const entry of style as ReadonlyArray<StyleProp<T>>) {
    const flat = flattenStyle(entry)
    if (flat === undefined) continue
    result = result === undefined ? { ...flat } : Object.assign(result, flat)
  }
  return result as T | undefined
}

const cache = new WeakMap<StyleRegistry, WeakMap<FlatStyle, string>>()

export const compileStyle = (
  style: StyleProp<FlatStyle>,
  registry: StyleRegistry = getStyleRegistry(),
): string => {
  const flat = flattenStyle(style)
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
