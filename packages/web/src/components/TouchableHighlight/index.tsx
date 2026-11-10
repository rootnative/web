import {
  Children,
  Fragment,
  cloneElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react'

import { usePressability } from '../../events/press'
import { mergeHandlers } from '../../events/press/mergeHandlers'
import type { PressabilityConfig } from '../../events/press/types'
import { hitSlopClass } from '../../render/hitSlop'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import { warnOnce } from '../../utils/warn'
import { useViewElement } from '../View'
import type { TouchableHighlightProps } from './types'

export type { TouchableHighlightProps } from './types'

const DEFAULT_ACTIVE_OPACITY = 0.85
const DEFAULT_UNDERLAY_COLOR = 'black'

const notCancelableStyle = Object.freeze({ touchAction: 'none' })

export function TouchableHighlight(props: TouchableHighlightProps): ReactElement {
  const {
    activeOpacity,
    children,
    delayLongPress,
    delayPressIn,
    delayPressOut,
    disabled,
    focusable,
    hasTVPreferredFocus: _hasTVPreferredFocus,
    hitSlop,
    nextFocusDown: _nextFocusDown,
    nextFocusForward: _nextFocusForward,
    nextFocusLeft: _nextFocusLeft,
    nextFocusRight: _nextFocusRight,
    nextFocusUp: _nextFocusUp,
    onBlur,
    onFocus,
    onHideUnderlay,
    onLongPress,
    onPress,
    onPressIn,
    onPressOut,
    onShowUnderlay,
    pressRetentionOffset,
    rejectResponderTermination,
    style,
    testOnly_pressed,
    touchSoundDisabled,
    underlayColor,
    ...rest
  } = props

  const [underlay, setUnderlay] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // React Native reads only `disabled` and `accessibilityState` here, not `aria-disabled`.
  const resolvedDisabled = disabled ?? props.accessibilityState?.disabled
  const hasPressHandler =
    onPress != null || onPressIn != null || onPressOut != null || onLongPress != null

  const config = useMemo<PressabilityConfig>(() => {
    const clearHideTimer = (): void => {
      if (hideTimer.current !== null) clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
    const show = (): void => {
      if (!hasPressHandler) return
      setUnderlay(true)
      onShowUnderlay?.()
    }
    const hide = (): void => {
      clearHideTimer()
      if (testOnly_pressed === true || !hasPressHandler) return
      setUnderlay(false)
      onHideUnderlay?.()
    }
    return {
      cancelable: rejectResponderTermination !== true,
      disabled: resolvedDisabled,
      hitSlop,
      delayLongPress,
      delayPressIn,
      delayPressOut,
      minPressDuration: 0,
      pressRectOffset: pressRetentionOffset,
      android_disableSound: touchSoundDisabled,
      onBlur,
      onFocus,
      onLongPress,
      // As in React Native, a press shows the underlay again and hides it after delayPressOut,
      // so even a short tap flashes it.
      onPress: (event) => {
        clearHideTimer()
        show()
        hideTimer.current = setTimeout(hide, delayPressOut ?? 0)
        onPress?.(event)
      },
      onPressIn: (event) => {
        clearHideTimer()
        show()
        onPressIn?.(event)
      },
      onPressOut: (event) => {
        if (hideTimer.current === null) hide()
        onPressOut?.(event)
      },
    }
  }, [
    delayLongPress,
    delayPressIn,
    delayPressOut,
    hasPressHandler,
    hitSlop,
    onBlur,
    onFocus,
    onHideUnderlay,
    onLongPress,
    onPress,
    onPressIn,
    onPressOut,
    onShowUnderlay,
    pressRetentionOffset,
    rejectResponderTermination,
    resolvedDisabled,
    testOnly_pressed,
    touchSoundDisabled,
  ])
  const handlers = usePressability(config)
  const registry = useStyleRegistry()

  useEffect(
    () => () => {
      if (hideTimer.current !== null) clearTimeout(hideTimer.current)
    },
    [],
  )

  const pressed = underlay || testOnly_pressed === true
  const child = Children.only(children) as ReactElement<{ style?: unknown }>
  if (child.type === Fragment) {
    warnOnce(
      'TouchableHighlight-fragment',
      'TouchableHighlight does not support a Fragment as its child. Wrap the children in one View.',
    )
  }
  const content =
    child.type === Fragment
      ? child
      : cloneElement(child, {
          style: [
            child.props.style,
            pressed && { opacity: activeOpacity ?? DEFAULT_ACTIVE_OPACITY },
          ],
        })

  return useViewElement(
    {
      ...rest,
      ...mergeHandlers(rest, handlers),
      focusable: focusable !== false && onPress !== undefined && disabled !== true,
      style: [
        style,
        pressed && { backgroundColor: underlayColor ?? DEFAULT_UNDERLAY_COLOR },
        rejectResponderTermination === true && notCancelableStyle,
      ],
      children: content,
      ...(resolvedDisabled === true && { 'aria-disabled': true }),
    },
    hitSlopClass(registry, hitSlop),
  )
}
