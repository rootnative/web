import {
  createElement,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactElement,
} from 'react'

import { usePressability } from '../../events/press'
import { mergeHandlers } from '../../events/press/mergeHandlers'
import type { PressabilityConfig } from '../../events/press/types'
import { toDOMProps } from '../../render/domProps'
import { withHostMethods } from '../../render/hostMethods'
import { resolveTag } from '../../render/resolveTag'
import { useElementLayout } from '../../render/useElementLayout'
import { toCSSColor } from '../../style/color'
import { compileReset, compileStyle, joinClassNames, pointerEventsStyle } from '../../style/compile'
import type { StyleRegistry } from '../../style/registry'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { TextAncestorContext } from './TextAncestorContext'
import type { TextProps } from './types'

export { TextAncestorContext } from './TextAncestorContext'
export type { PressEvent, TextInstance, TextProps } from './types'

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

// The style objects of Text are frozen and reused, so `compileStyle` caches their classes.
const multiLineStyles = new Map<number, Readonly<Record<string, unknown>>>()
const multiLineStyle = (lines: number): Readonly<Record<string, unknown>> => {
  let style = multiLineStyles.get(lines)
  if (style === undefined) {
    style = Object.freeze({
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      WebkitLineClamp: lines,
      overflow: 'hidden',
    })
    multiLineStyles.set(lines, style)
  }
  return style
}

const clipStyle = Object.freeze({ textOverflow: 'clip' })
const notSelectableStyle = Object.freeze({ userSelect: 'none' })

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
    onBlur,
    onFocus,
    onLayout,
    onLongPress,
    onPress,
    onPressIn,
    onPressOut,
    pointerEvents,
    pressRetentionOffset,
    ref,
    selectable,
    selectionColor,
    style,
    suppressHighlighting: _suppressHighlighting,
    ...rest
  } = props

  const nested = useContext(TextAncestorContext)
  const element = useRef<HTMLElement | null>(null)
  useImperativeHandle(ref, () => withHostMethods(element.current as HTMLElement), [])
  useElementLayout(element, onLayout)
  const registry = useStyleRegistry()

  // As in React Native, onPress or onLongPress makes a Text pressable. onPressIn and onPressOut
  // alone don't.
  const pressable = (onPress != null || onLongPress != null) && disabled !== true
  const config = useMemo<PressabilityConfig | null>(
    () =>
      pressable
        ? {
            pressRectOffset: pressRetentionOffset,
            onBlur,
            onFocus,
            onLongPress,
            onPress,
            onPressIn,
            onPressOut,
          }
        : null,
    [pressable, pressRetentionOffset, onBlur, onFocus, onLongPress, onPress, onPressIn, onPressOut],
  )
  const handlers = usePressability(config)

  // As in React Native, a pressable Text with no role is a link.
  const roleProps =
    pressable && rest.role === undefined && rest.accessibilityRole === undefined
      ? { ...rest, role: 'link' as const }
      : rest
  const { tag, role } = resolveTag(roleProps, 'span', children != null)

  const lineStyle =
    numberOfLines === undefined || numberOfLines < 1
      ? undefined
      : numberOfLines === 1
        ? singleLineStyle
        : multiLineStyle(numberOfLines)
  const pointerStyle = pointerEvents === undefined ? undefined : pointerEventsStyle[pointerEvents]

  let className = joinClassNames(
    nested
      ? compileReset('rn-text-nested', nestedResetStyle, registry)
      : compileReset('rn-text', resetStyle, registry),
    compileStyle(
      [
        style,
        lineStyle,
        ellipsizeMode === 'clip' && clipStyle,
        selectable === false && notSelectableStyle,
        pointerStyle,
      ],
      registry,
    ),
  )
  if (selectionColor !== undefined) {
    const extra = selectionClass(registry, selectionColor)
    if (extra !== undefined) className = `${className} ${extra}`
  }

  const domProps = toDOMProps(rest)
  if (role !== undefined) domProps['role'] = role
  if (tag.length === 2 && tag[0] === 'h') delete domProps['aria-level']
  // A button submits its form by default. A React Native button never does.
  if (tag === 'button') domProps['type'] = 'button'
  if (disabled === true) domProps['aria-disabled'] = true
  if (pressable && handlers !== null) {
    Object.assign(domProps, mergeHandlers(rest, handlers))
    // A link has to be reachable by keyboard. The press responder presses it on Enter and Space.
    if (domProps['tabIndex'] === undefined && tag !== 'a' && tag !== 'button') {
      domProps['tabIndex'] = 0
    }
  } else {
    if (onFocus !== undefined) domProps['onFocus'] = onFocus
    if (onBlur !== undefined) domProps['onBlur'] = onBlur
  }
  domProps['className'] = className
  domProps['ref'] = element

  const content = nested
    ? children
    : createElement(TextAncestorContext.Provider, { value: true }, children)
  return createElement(tag, domProps, content)
}
