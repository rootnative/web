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

// A child selector can't be an atomic class. The child rule of `box-none` has no specificity, so
// a child with its own `pointerEvents` keeps it. The children of `box-only` are never a target.
const boxPointerEventsClass = (value: unknown, registry: StyleRegistry): string | undefined => {
  if (value === 'box-none') {
    return registry.staticClass('rn-pe-box-none', [
      '.rn-pe-box-none{pointer-events:none}',
      ':where(.rn-pe-box-none)>*{pointer-events:auto}',
    ])
  }
  if (value === 'box-only') {
    return registry.staticClass('rn-pe-box-only', [
      '.rn-pe-box-only{pointer-events:auto}',
      '.rn-pe-box-only>*{pointer-events:none!important}',
    ])
  }
  return undefined
}

// The `pointerEvents` prop as a style. The prop wins over the same key of `style`.
export const pointerEventsStyle: Readonly<
  Record<'auto' | 'none' | 'box-none' | 'box-only', FlatStyle>
> = Object.freeze({
  auto: Object.freeze({ pointerEvents: 'auto' }),
  none: Object.freeze({ pointerEvents: 'none' }),
  'box-none': Object.freeze({ pointerEvents: 'box-none' }),
  'box-only': Object.freeze({ pointerEvents: 'box-only' }),
})

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

  const classes = joinClassNames(
    registry.classesFor(resolveStyle(flat)),
    boxPointerEventsClass(flat['pointerEvents'], registry),
  )
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
