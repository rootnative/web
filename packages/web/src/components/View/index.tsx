import { createElement, useImperativeHandle, useRef, type ReactElement } from 'react'

import { toDOMProps } from '../../render/domProps'
import { resolveTag } from '../../render/resolveTag'
import { useElementLayout } from '../../render/useElementLayout'
import { compileReset, compileStyle, joinClassNames } from '../../style/compile'
import type { StyleRegistry } from '../../style/registry'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import type { ViewProps } from './types'

export type {
  AccessibilityProps,
  AccessibilityState,
  AccessibilityValue,
  DOMEventHandlers,
  LayoutChangeEvent,
  LayoutRectangle,
  Role,
  ViewProps,
} from './types'

// What a native View looks like before any style is applied.
const resetStyle = Object.freeze({
  alignItems: 'stretch',
  backgroundColor: 'transparent',
  border: '0 solid black',
  boxSizing: 'border-box',
  display: 'flex',
  flexBasis: 'auto',
  flexDirection: 'column',
  flexShrink: 0,
  listStyle: 'none',
  margin: 0,
  minHeight: 0,
  minWidth: 0,
  padding: 0,
  position: 'relative',
  textDecoration: 'none',
  zIndex: 0,
})

const pointerEventsClass = (registry: StyleRegistry, value: 'box-none' | 'box-only'): string =>
  registry.staticClass(
    `rn-pe-${value}`,
    value === 'box-none'
      ? ['.rn-pe-box-none{pointer-events:none}', '.rn-pe-box-none>*{pointer-events:auto}']
      : ['.rn-pe-box-only{pointer-events:auto}', '.rn-pe-box-only>*{pointer-events:none}'],
  )

export function View(props: ViewProps): ReactElement {
  return useViewElement(props)
}

// Internal. The body of View, with an extra class for components built on it.
export function useViewElement(props: ViewProps, extraClassName?: string): ReactElement {
  const { children, onLayout, pointerEvents, ref, style, ...rest } = props

  const element = useRef<HTMLElement | null>(null)
  useImperativeHandle(ref, () => element.current as HTMLElement, [])
  useElementLayout(element, onLayout)
  const registry = useStyleRegistry()

  const { tag, role } = resolveTag(rest, 'div', children != null)

  const pointerStyle =
    pointerEvents === 'none' || pointerEvents === 'auto' ? { pointerEvents } : undefined
  let className = joinClassNames(
    compileReset('rn-view', resetStyle, registry),
    compileStyle([style, pointerStyle], registry),
  )
  if (pointerEvents === 'box-none' || pointerEvents === 'box-only') {
    className = `${className} ${pointerEventsClass(registry, pointerEvents)}`
  }
  if (extraClassName !== undefined) className = `${className} ${extraClassName}`

  const domProps = toDOMProps(rest)
  if (role !== undefined) domProps['role'] = role
  if (tag.length === 2 && tag[0] === 'h') delete domProps['aria-level']
  // A button submits its form by default. A React Native button never does.
  if (tag === 'button') domProps['type'] = 'button'
  domProps['className'] = className
  domProps['ref'] = element

  return createElement(tag, domProps, children)
}
