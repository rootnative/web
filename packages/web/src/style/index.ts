import { flattenStyle } from './compile'
import { isShorthandProperty } from './registry'
import { resolveStyle } from './resolveStyle'
import { toCSSTextShadow } from './shadow'
import { toCSSTransform } from './transform'
import type { CSSDeclarations, FlatStyle, StyleProp } from './types'

export type { CSSDeclarations } from './types'

/**
 * Compat export. Compiles a React Native style to inline DOM style values, keyed by the
 * camel-case names of `CSSStyleDeclaration`, with the same rules as the class names of `View`.
 * Libraries such as Reanimated write the result into `element.style` on each frame.
 *
 * Shorthands come first, so a longhand written after them wins, as it does in the class names.
 */
export const createReactDOMStyle = (style: StyleProp<FlatStyle>): CSSDeclarations => {
  const flat = flattenStyle(style)
  if (flat === undefined) return {}

  const resolved = resolveStyle(flat)
  const shorthands: CSSDeclarations = {}
  const longhands: CSSDeclarations = {}
  for (const name in resolved) {
    const target = isShorthandProperty(name) ? shorthands : longhands
    target[name] = resolved[name] as string
  }
  return Object.assign(shorthands, longhands)
}

/**
 * Compat export. Turns a React Native `transform` array into a CSS `transform` value. An empty
 * string for a value that has no valid transform.
 */
export const createTransformValue = (transform: unknown): string => toCSSTransform(transform) ?? ''

/**
 * Compat export. Turns the three React Native text shadow props into a CSS `text-shadow` value.
 * `undefined` for a color that it can't parse.
 */
export const createTextShadowValue = (style: {
  readonly textShadowColor?: unknown
  readonly textShadowOffset?: unknown
  readonly textShadowRadius?: unknown
}): string | undefined => toCSSTextShadow(style)

// react-native-web's `createReactDOMStyle` module has the function as its default export. The
// Vite plugin points that module name here, so the same shape must be here too.
export default createReactDOMStyle
