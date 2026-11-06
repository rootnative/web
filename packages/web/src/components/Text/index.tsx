import {
  createElement,
  useCallback,
  useContext,
  useImperativeHandle,
  useRef,
  type MouseEvent,
  type ReactElement,
} from 'react'

import { toDOMProps } from '../../render/domProps'
import { resolveTag } from '../../render/resolveTag'
import { useElementLayout } from '../../render/useElementLayout'
import { toCSSColor } from '../../style/color'
import { compileStyle } from '../../style/compile'
import type { StyleRegistry } from '../../style/registry'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { TextAncestorContext } from './TextAncestorContext'
import type { TextProps } from './types'

export { TextAncestorContext } from './TextAncestorContext'
export type { PressEvent, TextProps } from './types'

// What a native Text looks like before any style is applied.
const resetStyle = Object.freeze({
  backgroundColor: 'transparent',
  border: '0 solid black',
  boxSizing: 'border-box',
  color: 'black',
  display: 'inline',
  fontFamily: 'System',
  fontSize: 14,
  listStyle: 'none',
  margin: 0,
  padding: 0,
  position: 'relative',
  textAlign: 'start',
  textDecoration: 'none',
  whiteSpace: 'pre-wrap',
  wordWrap: 'break-word',
})

// A Text inside a Text inherits everything from its parent.
const nestedResetStyle = Object.freeze({
  color: 'inherit',
  font: 'inherit',
  textAlign: 'inherit',
  textDecoration: 'inherit',
  whiteSpace: 'inherit',
})

const singleLineStyle = Object.freeze({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const multiLineStyle = (lines: number): Record<string, unknown> => ({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: lines,
  overflow: 'hidden',
})

const selectionClass = (registry: StyleRegistry, color: string): string | undefined => {
  const css = toCSSColor(color)
  if (css === undefined) return undefined
  const name = `rn-sel-${css.replace(/[^a-z0-9]/g, '')}`
  return registry.staticClass(name, [`.${name}::selection{background-color:${css}}`])
}

export function Text(props: TextProps): ReactElement {
  const {
    children,
    disabled,
    ellipsizeMode,
    numberOfLines,
    onClick,
    onLayout,
    onPress,
    pointerEvents,
    ref,
    selectable,
    selectionColor,
    style,
    ...rest
  } = props

  const nested = useContext(TextAncestorContext)
  const element = useRef<HTMLElement | null>(null)
  useImperativeHandle(ref, () => element.current as HTMLElement, [])
  useElementLayout(element, onLayout)
  const registry = useStyleRegistry()

  const { tag, role } = resolveTag(rest, 'span')

  const lineStyle =
    numberOfLines === undefined || numberOfLines < 1
      ? undefined
      : numberOfLines === 1
        ? singleLineStyle
        : multiLineStyle(numberOfLines)
  const clipStyle = ellipsizeMode === 'clip' ? { textOverflow: 'clip' } : undefined
  const selectStyle = selectable === false ? { userSelect: 'none' } : undefined
  const pointerStyle =
    pointerEvents === 'none' || pointerEvents === 'auto' ? { pointerEvents } : undefined

  let className = compileStyle(
    [
      nested ? nestedResetStyle : resetStyle,
      style,
      lineStyle,
      clipStyle,
      selectStyle,
      pointerStyle,
    ],
    registry,
  )
  if (selectionColor !== undefined) {
    const extra = selectionClass(registry, selectionColor)
    if (extra !== undefined) className = `${className} ${extra}`
  }

  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      onClick?.(event)
      if (disabled === true || event.defaultPrevented) return
      onPress?.(event)
    },
    [disabled, onClick, onPress],
  )

  const domProps = toDOMProps(rest)
  if (role !== undefined) domProps['role'] = role
  if (tag.length === 2 && tag[0] === 'h') delete domProps['aria-level']
  if (disabled === true) domProps['aria-disabled'] = true
  if (onPress !== undefined || onClick !== undefined) domProps['onClick'] = handleClick
  domProps['className'] = className
  domProps['ref'] = element

  const content = nested
    ? children
    : createElement(TextAncestorContext.Provider, { value: true }, children)
  return createElement(tag, domProps, content)
}
