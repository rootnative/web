import type { ViewStyle } from '../apis/StyleSheet/types'

/**
 * A frozen style for the internals of a component that uses CSS React Native doesn't have, such
 * as `overflowX` or `position: 'sticky'`. The compiler passes unknown names through to CSS.
 */
export const webStyle = (style: Readonly<Record<string, string | number>>): ViewStyle =>
  Object.freeze(style) as ViewStyle
