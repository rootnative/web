import { memo, useMemo, useState, type NamedExoticComponent, type ReactElement } from 'react'

import { usePressability } from '../../events/press'
import { mergeHandlers } from '../../events/press/mergeHandlers'
import type { PressabilityConfig, RectOrSize } from '../../events/press/types'
import type { StyleRegistry } from '../../style/registry'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { useViewElement } from '../View'
import type { ViewProps } from '../View/types'
import type { PressableProps, PressableStateCallbackType } from './types'

export type {
  PressableAndroidRippleConfig,
  PressableInstance,
  PressableProps,
  PressableStateCallbackType,
} from './types'

const notCancelableStyle = Object.freeze({ touchAction: 'none' })

// The browser hit-tests a pseudo-element as part of its element, so an invisible ::before
// box around the element grows its hit area. z-index -1 keeps it under the children, so it
// never takes a press from them.
const hitSlopClass = (
  registry: StyleRegistry,
  hitSlop: RectOrSize | undefined,
): string | undefined => {
  if (hitSlop === undefined) return undefined
  const rect =
    typeof hitSlop === 'number'
      ? { top: hitSlop, right: hitSlop, bottom: hitSlop, left: hitSlop }
      : hitSlop
  const { top = 0, right = 0, bottom = 0, left = 0 } = rect
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return undefined

  const name = `rn-hs-${[top, right, bottom, left].map((n) => String(n).replace(/[^0-9]/g, '_')).join('-')}`
  return registry.staticClass(name, [
    `.${name}::before{content:"";position:absolute;` +
      `top:${-top}px;right:${-right}px;bottom:${-bottom}px;left:${-left}px;z-index:-1}`,
  ])
}

// Safari before 15.4 has no :focus-visible. There, any focus counts.
const isFocusVisible = (element: Element): boolean => {
  try {
    return element.matches(':focus-visible')
  } catch {
    return true
  }
}

export const Pressable: NamedExoticComponent<PressableProps> = memo(function Pressable(
  props: PressableProps,
): ReactElement {
  const {
    android_disableSound,
    android_ripple: _androidRipple,
    blockNativeResponder,
    cancelable,
    children,
    delayHoverIn,
    delayHoverOut,
    delayLongPress,
    disabled,
    focusable,
    hitSlop,
    onBlur,
    onFocus,
    onHoverIn,
    onHoverOut,
    onLongPress,
    onPress,
    onPressIn,
    onPressMove,
    onPressOut,
    pressRetentionOffset,
    style,
    testOnly_pressed,
    unstable_pressDelay,
    ...rest
  } = props

  const [pressed, setPressed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  // As on native, the state re-renders only a Pressable that reads it.
  const tracksState = typeof children === 'function' || typeof style === 'function'

  const config = useMemo<PressabilityConfig>(
    () => ({
      cancelable,
      disabled,
      hitSlop,
      pressRectOffset: pressRetentionOffset,
      android_disableSound,
      delayHoverIn,
      delayHoverOut,
      delayLongPress,
      delayPressIn: unstable_pressDelay,
      blockNativeResponder,
      onLongPress,
      onPress,
      onPressMove,
      onPressIn: (event) => {
        if (tracksState) setPressed(true)
        onPressIn?.(event)
      },
      onPressOut: (event) => {
        if (tracksState) setPressed(false)
        onPressOut?.(event)
      },
      onHoverIn: (event) => {
        if (tracksState) setHovered(true)
        onHoverIn?.(event)
      },
      onHoverOut: (event) => {
        if (tracksState) setHovered(false)
        onHoverOut?.(event)
      },
      onFocus: (event) => {
        if (tracksState && event.target === event.currentTarget) {
          setFocused(isFocusVisible(event.currentTarget))
        }
        onFocus?.(event)
      },
      onBlur: (event) => {
        if (tracksState && event.target === event.currentTarget) setFocused(false)
        onBlur?.(event)
      },
    }),
    [
      android_disableSound,
      blockNativeResponder,
      cancelable,
      delayHoverIn,
      delayHoverOut,
      delayLongPress,
      disabled,
      hitSlop,
      onBlur,
      onFocus,
      onHoverIn,
      onHoverOut,
      onLongPress,
      onPress,
      onPressIn,
      onPressMove,
      onPressOut,
      pressRetentionOffset,
      tracksState,
      unstable_pressDelay,
    ],
  )
  const handlers = usePressability(config)
  const registry = useStyleRegistry()

  const state: PressableStateCallbackType = {
    pressed: pressed || testOnly_pressed === true,
    hovered,
    focused,
  }

  const viewProps: ViewProps = {
    ...rest,
    ...mergeHandlers(rest, handlers),
    focusable: disabled !== true && focusable !== false,
    style: [
      typeof style === 'function' ? style(state) : style,
      cancelable === false && notCancelableStyle,
    ],
    children: typeof children === 'function' ? children(state) : children,
  }
  if (disabled === true) viewProps['aria-disabled'] = true

  return useViewElement(viewProps, hitSlopClass(registry, hitSlop))
})
