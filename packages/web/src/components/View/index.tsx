import { createElement, useImperativeHandle, useRef, type ReactElement } from 'react'

import { usePanHost } from '../../events/panTouch'
import { toDOMProps } from '../../render/domProps'
import { withHostMethods } from '../../render/hostMethods'
import { resolveTag } from '../../render/resolveTag'
import { withServerStyles } from '../../render/serverStyles'
import { useElementLayout } from '../../render/useElementLayout'
import {
  compileReset,
  compileStyleProps,
  joinClassNames,
  pointerEventsStyle,
} from '../../style/compile'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import type { ViewProps } from './types'

export type {
  AccessibilityActionEvent,
  AccessibilityProps,
  AccessibilityState,
  AccessibilityValue,
  DOMEventHandlers,
  HostComponent,
  HostInstance,
  HostMethods,
  LayoutChangeEvent,
  LayoutRectangle,
  MeasureInWindowOnSuccessCallback,
  MeasureLayoutOnSuccessCallback,
  MeasureOnSuccessCallback,
  Role,
  ViewInstance,
  ViewProps,
} from './types'

// What a native View looks like before any style is applied.
const resetStyle = Object.freeze({
  alignContent: 'flex-start',
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

export function View(props: ViewProps): ReactElement {
  return useViewElement(props)
}

// Internal. The body of View, with an extra class for components built on it.
export function useViewElement(props: ViewProps, extraClassName?: string): ReactElement {
  const { children, onLayout, pointerEvents, ref, style, ...rest } = props

  const element = useRef<HTMLElement | null>(null)
  useImperativeHandle(ref, () => withHostMethods(element.current as HTMLElement), [])
  useElementLayout(element, onLayout)
  usePanHost(element, rest.onPointerDownCapture)
  const registry = useStyleRegistry()

  const { tag, role } = resolveTag(rest, 'div', children != null)

  const compiled = compileStyleProps(
    pointerEvents === undefined ? style : [style, pointerEventsStyle[pointerEvents]],
    registry,
  )
  let className = joinClassNames(compileReset('rn-view', resetStyle, registry), compiled.className)
  if (extraClassName !== undefined) className = `${className} ${extraClassName}`

  const domProps = toDOMProps(rest)
  if (role !== undefined) domProps['role'] = role
  if (tag.length === 2 && tag[0] === 'h') delete domProps['aria-level']
  // A button submits its form by default. A React Native button never does.
  if (tag === 'button') domProps['type'] = 'button'
  domProps['className'] = className
  if (compiled.style !== undefined) domProps['style'] = compiled.style
  domProps['ref'] = element

  return withServerStyles(registry, createElement(tag, domProps, children))
}
