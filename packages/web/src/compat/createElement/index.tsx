import { createElement, type ElementType, type Key, type ReactElement } from 'react'

import { isNativeHandler, toDOMProps } from '../../render/domProps'
import { compileStyle } from '../../style/compile'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import type { FlatStyle, StyleProp } from '../../style/types'

export type CreateElementProps = Readonly<Record<string, unknown>>

// `toDOMProps` turns these into DOM attributes, so the names themselves never reach the element.
const mappedProps = new Set(['focusable', 'importantForAccessibility', 'nativeID', 'testID'])

const isNativeOnly = (name: string): boolean =>
  mappedProps.has(name) || name.startsWith('accessibility') || isNativeHandler(name)

type HostProps = { type: ElementType; props: CreateElementProps }

// The style registry comes from a context, and the caller can be a class component.
// So the host element renders inside this component.
function Host({ type, props }: HostProps): ReactElement {
  const registry = useStyleRegistry()
  const { className, style, ...rest } = props

  // Unlike `View`, an unknown prop stays: `d`, `fill`, and `viewBox` of an SVG element must
  // reach the element.
  const domProps: Record<string, unknown> = {}
  for (const name in rest) {
    if (!isNativeOnly(name)) domProps[name] = rest[name]
  }
  Object.assign(domProps, toDOMProps(rest as Parameters<typeof toDOMProps>[0]))

  const compiled = compileStyle(style as StyleProp<FlatStyle>, registry)
  const classes = typeof className === 'string' && className !== '' ? [className] : []
  if (compiled !== '') classes.push(compiled)
  if (classes.length > 0) domProps['className'] = classes.join(' ')

  return createElement(type, domProps)
}

/**
 * Compat export. Renders `type` with React Native props: `style` compiles to class names, and
 * the accessibility props become ARIA attributes. Every other prop goes to the element as it
 * is. Libraries such as `react-native-svg` import it from `react-native` on the web.
 */
export const unstable_createElement = (
  type: ElementType,
  props?: CreateElementProps | null,
): ReactElement => {
  const hostProps = props ?? {}
  return createElement(Host, { key: hostProps['key'] as Key | undefined, type, props: hostProps })
}
