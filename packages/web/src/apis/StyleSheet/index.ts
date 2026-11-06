import { flattenStyle } from '../../style/compile'
import type { FlatStyle, StyleProp } from '../../style/types'

export type { StyleProp } from '../../style/types'

type NamedStyles<T> = { [P in keyof T]: FlatStyle }

const absoluteFillObject = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
} as const

export type AbsoluteFillStyle = typeof absoluteFillObject

const create = <T extends NamedStyles<T>>(styles: T): T => {
  for (const key in styles) Object.freeze(styles[key])
  return Object.freeze(styles)
}

const flatten = <T extends FlatStyle>(style: StyleProp<T>): T | undefined => flattenStyle(style)

const compose = <T extends FlatStyle>(style1: StyleProp<T>, style2: StyleProp<T>): StyleProp<T> => {
  if (style1 && style2) return [style1, style2]
  return style1 || style2
}

export const StyleSheet: {
  readonly absoluteFill: AbsoluteFillStyle
  readonly absoluteFillObject: AbsoluteFillStyle
  readonly hairlineWidth: number
  readonly create: typeof create
  readonly flatten: typeof flatten
  readonly compose: typeof compose
} = Object.freeze({
  absoluteFill: Object.freeze(absoluteFillObject),
  absoluteFillObject,
  // One CSS pixel. The browser draws it at device resolution, so a 0.5px value is not needed.
  hairlineWidth: 1,
  create,
  flatten,
  compose,
})
