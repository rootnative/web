// React Native's list: the props that place a box among its siblings.
const OUTER = new Set([
  'margin',
  'marginHorizontal',
  'marginVertical',
  'marginBottom',
  'marginTop',
  'marginLeft',
  'marginRight',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'height',
  'minHeight',
  'maxHeight',
  'width',
  'minWidth',
  'maxWidth',
  'position',
  'left',
  'right',
  'bottom',
  'top',
  'transform',
  'transformOrigin',
  'rowGap',
  'columnGap',
  'gap',
])

/**
 * Splits a flat style in two, as React Native's `splitLayoutProps` does: `outer` places the box,
 * `inner` is the rest. A wrapper takes `outer` and the wrapped box takes `inner`.
 */
export const splitLayoutProps = (
  style: object | null | undefined,
): { outer: Record<string, unknown>; inner: Record<string, unknown> } => {
  const outer: Record<string, unknown> = {}
  const inner: Record<string, unknown> = {}
  if (style == null) return { outer, inner }
  for (const [prop, value] of Object.entries(style)) {
    if (OUTER.has(prop)) outer[prop] = value
    else inner[prop] = value
  }
  return { outer, inner }
}
