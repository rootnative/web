import { getLeftAndRightSwap } from './direction'
import { getStyleRegistry, type StyleRegistry } from './registry'
import { resolveStyle } from './resolveStyle'
import type { CSSDeclarations, FlatStyle, StyleProp } from './types'

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
// The classes of a style, and the declarations that go into the `style` attribute because the
// registry has no rule for them. See `MAX_VALUES_OF_PROPERTY`.
export type CompiledStyle = {
  readonly className: string
  readonly style: Readonly<CSSDeclarations> | undefined
}

const NO_STYLE: CompiledStyle = Object.freeze({ className: '', style: undefined })

type CacheNode = {
  classes: string | undefined
  compiled: CompiledStyle | undefined
  frozen: WeakMap<FlatStyle, CacheNode> | undefined
  values: Map<string, Map<unknown, CacheNode>> | undefined
}

const newNode = (): CacheNode => ({
  classes: undefined,
  compiled: undefined,
  frozen: undefined,
  values: undefined,
})

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

const compileFlatWithStyle = (
  flat: FlatStyle | undefined,
  registry: StyleRegistry,
): CompiledStyle => {
  if (flat === undefined) return NO_STYLE
  const inline: CSSDeclarations = {}
  const className = joinClassNames(
    registry.classesFor(resolveStyle(flat), inline),
    boxPointerEventsClass(flat['pointerEvents'], registry),
  )
  let hasInline = false
  for (const _ in inline) {
    hasInline = true
    break
  }
  return Object.freeze({ className, style: hasInline ? Object.freeze(inline) : undefined })
}

const leafOf = (style: StyleProp<object>, registry: StyleRegistry): CacheNode | undefined => {
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
  return walk(style, root)
}

const isNoStyle = (style: StyleProp<object>): boolean =>
  style === null || style === undefined || style === false || style === ''

// The classes of a style, with a rule for each declaration. The components use
// `compileStyleProps`, which can put a declaration into the `style` attribute.
export const compileStyle = (
  style: StyleProp<object>,
  registry: StyleRegistry = getStyleRegistry(),
): string => {
  if (isNoStyle(style)) return ''
  const leaf = leafOf(style, registry)
  if (leaf === undefined) {
    return compileFlat(flattenStyle(style) as FlatStyle | undefined, registry)
  }
  leaf.classes ??= compileFlat(flattenStyle(style) as FlatStyle | undefined, registry)
  return leaf.classes
}

// The `className` and the `style` of the element of a component. The result of one style is one
// frozen object, so React sees the same `style` on each render.
export const compileStyleProps = (
  style: StyleProp<object>,
  registry: StyleRegistry = getStyleRegistry(),
): CompiledStyle => {
  if (isNoStyle(style)) return NO_STYLE
  const leaf = leafOf(style, registry)
  if (leaf === undefined) {
    return compileFlatWithStyle(flattenStyle(style) as FlatStyle | undefined, registry)
  }
  leaf.compiled ??= compileFlatWithStyle(flattenStyle(style) as FlatStyle | undefined, registry)
  return leaf.compiled
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

/**
 * As `compileReset`, with one rule for each selector, for a default that depends on the parent
 * element. Each selector starts with `.className` and adds no weight to it.
 */
export const compileResetRules = (
  className: string,
  rules: ReadonlyArray<readonly [selector: string, style: FlatStyle]>,
  registry: StyleRegistry = getStyleRegistry(),
): string =>
  registry.hasClass(className)
    ? className
    : registry.resetClassRules(
        className,
        rules.map(([selector, style]) => [selector, resolveStyle(style)] as const),
      )

// Joins class names and skips the empty ones.
export const joinClassNames = (...names: ReadonlyArray<string | false | undefined>): string =>
  names.filter((name) => typeof name === 'string' && name !== '').join(' ')
