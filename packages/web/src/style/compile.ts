import { getLeftAndRightSwap } from './direction'
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

// A path through the cache, one frozen style object for each step. The classes of a node are the
// classes of the objects on its path, flattened in that order.
type CacheNode = { classes: string | undefined; next: WeakMap<FlatStyle, CacheNode> | undefined }

// One cache for each value of the left and right swap, because the classes of a style differ.
const caches = [
  new WeakMap<StyleRegistry, WeakMap<FlatStyle, CacheNode>>(),
  new WeakMap<StyleRegistry, WeakMap<FlatStyle, CacheNode>>(),
] as const

// Static objects from StyleSheet.create are frozen, so they can be cache keys. Returns false at
// the first entry that isn't a frozen object. `Object.isFrozen` is true for a number, and a
// WeakMap throws on it.
const collectFrozen = (style: StyleProp<object>, out: FlatStyle[]): boolean => {
  if (style === null || style === undefined || style === false || style === '') return true
  if (Array.isArray(style)) {
    for (const entry of style as ReadonlyArray<StyleProp<object>>) {
      if (!collectFrozen(entry, out)) return false
    }
    return true
  }
  if (typeof style !== 'object' || !Object.isFrozen(style)) return false
  out.push(style as FlatStyle)
  return true
}

const compileFlat = (flat: FlatStyle | undefined, registry: StyleRegistry): string =>
  flat === undefined
    ? ''
    : joinClassNames(
        registry.classesFor(resolveStyle(flat)),
        boxPointerEventsClass(flat['pointerEvents'], registry),
      )

export const compileStyle = (
  style: StyleProp<object>,
  registry: StyleRegistry = getStyleRegistry(),
): string => {
  const frozen: FlatStyle[] = []
  if (!collectFrozen(style, frozen)) {
    return compileFlat(flattenStyle(style) as FlatStyle | undefined, registry)
  }
  if (frozen.length === 0) return ''

  const cache = caches[getLeftAndRightSwap() ? 1 : 0]
  let level = cache.get(registry)
  if (level === undefined) {
    level = new WeakMap()
    cache.set(registry, level)
  }
  let node: CacheNode | undefined
  for (const object of frozen) {
    if (node !== undefined) level = node.next ??= new WeakMap()
    node = level.get(object)
    if (node === undefined) {
      node = { classes: undefined, next: undefined }
      level.set(object, node)
    }
  }
  const leaf = node as CacheNode
  leaf.classes ??= compileFlat(
    frozen.length === 1 ? frozen[0] : flattenStyle<FlatStyle>(frozen),
    registry,
  )
  return leaf.classes
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
