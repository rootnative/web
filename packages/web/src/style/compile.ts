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

// A path through the cache. A frozen object, as from StyleSheet.create, is one step by identity.
// Any other object is one step for each of its declarations, by name and value: a component
// that makes a new style object on each render still makes the same declarations. The classes
// of a node are the classes of the steps on its path, flattened in that order.
type CacheNode = {
  classes: string | undefined
  frozen: WeakMap<FlatStyle, CacheNode> | undefined
  values: Map<string, Map<unknown, CacheNode>> | undefined
}

const newNode = (): CacheNode => ({ classes: undefined, frozen: undefined, values: undefined })

// One cache for each value of the left and right swap, because the classes of a style differ.
let caches: readonly [WeakMap<StyleRegistry, CacheNode>, WeakMap<StyleRegistry, CacheNode>] = [
  new WeakMap(),
  new WeakMap(),
]

// A value that changes on each render, such as an animated width, makes a new node each time.
// Past this number of such nodes, the cache starts again.
export const MAX_VALUE_NODES = 10_000
let valueNodes = 0

// The node at the end of the path of `style`, from `node`. Undefined for a style with no path:
// a value that isn't a primitive, such as a transform, or an entry that isn't an object.
const walk = (style: StyleProp<object>, node: CacheNode): CacheNode | undefined => {
  if (style === null || style === undefined || style === false || style === '') return node
  if (Array.isArray(style)) {
    let current: CacheNode | undefined = node
    for (const entry of style as ReadonlyArray<StyleProp<object>>) {
      current = walk(entry, current)
      if (current === undefined) return undefined
    }
    return current
  }
  // `Object.isFrozen` is true for a number, and a WeakMap throws on it.
  if (typeof style !== 'object') return undefined

  if (Object.isFrozen(style)) {
    const frozen = (node.frozen ??= new WeakMap())
    let next = frozen.get(style as FlatStyle)
    if (next === undefined) {
      next = newNode()
      frozen.set(style as FlatStyle, next)
    }
    return next
  }

  let current = node
  for (const name in style) {
    if (!Object.hasOwn(style, name)) continue
    const value = (style as FlatStyle)[name]
    const type = typeof value
    if ((type === 'object' && value !== null) || type === 'function') return undefined
    const values = (current.values ??= new Map())
    let byValue = values.get(name)
    if (byValue === undefined) {
      byValue = new Map()
      values.set(name, byValue)
    }
    let next = byValue.get(value)
    if (next === undefined) {
      next = newNode()
      byValue.set(value, next)
      valueNodes += 1
    }
    current = next
  }
  return current
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
  if (style === null || style === undefined || style === false || style === '') return ''
  if (valueNodes > MAX_VALUE_NODES) {
    caches = [new WeakMap(), new WeakMap()]
    valueNodes = 0
  }

  const cache = caches[getLeftAndRightSwap() ? 1 : 0]
  let root = cache.get(registry)
  if (root === undefined) {
    root = newNode()
    cache.set(registry, root)
  }
  const leaf = walk(style, root)
  if (leaf === undefined) {
    return compileFlat(flattenStyle(style) as FlatStyle | undefined, registry)
  }
  leaf.classes ??= compileFlat(flattenStyle(style) as FlatStyle | undefined, registry)
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
): string =>
  // Each render of each component calls this, so the style resolves only for a new class.
  registry.hasClass(className) ? className : registry.resetClass(className, resolveStyle(style))

// Joins class names and skips the empty ones.
export const joinClassNames = (...names: ReadonlyArray<string | false | undefined>): string =>
  names.filter((name) => typeof name === 'string' && name !== '').join(' ')
