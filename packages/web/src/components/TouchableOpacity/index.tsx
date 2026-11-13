import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactElement,
} from 'react'

import type { ViewStyle } from '../../apis/StyleSheet/types'
import { usePressability } from '../../events/press'
import { mergeHandlers } from '../../events/press/mergeHandlers'
import type { PressabilityConfig } from '../../events/press/types'
import { hitSlopClass } from '../../render/hitSlop'
import { flattenStyle } from '../../style/compile'
import { useStyleRegistry } from '../../style/StyleRegistryContext'
import type { StyleProp } from '../../style/types'
import { useViewElement } from '../View'
import type { TouchableOpacityProps } from './types'

export type { TouchableOpacityProps } from './types'

// Easing.inOut(Easing.quad), the curve of React Native's TouchableOpacity, as a cubic Bézier.
const EASE_IN_OUT_QUAD = 'cubic-bezier(0.455, 0.03, 0.515, 0.955)'
const DEFAULT_ACTIVE_OPACITY = 0.2

const notCancelableStyle = Object.freeze({ touchAction: 'none' })

const isTrue = (value: unknown): boolean | undefined =>
  value === undefined ? undefined : value === true || value === 'true'

const restingOpacity = (style: StyleProp<ViewStyle> | undefined): number => {
  const opacity = flattenStyle(style)?.opacity
  return typeof opacity === 'number' ? opacity : 1
}

export function TouchableOpacity(props: TouchableOpacityProps): ReactElement {
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
    onLongPress,
    onPress,
    onPressIn,
    onPressOut,
    pressRetentionOffset,
    ref,
    rejectResponderTermination,
    style,
    touchSoundDisabled,
    ...rest
  } = props

  const element = useRef<HTMLElement | null>(null)
  const animation = useRef<Animation | null>(null)
  const resting = restingOpacity(style)
  const resolvedDisabled =
    disabled ?? isTrue(props['aria-disabled']) ?? props.accessibilityState?.disabled

  // An imperative animation, as with the native driver: a press doesn't render again. It starts
  // from the current opacity, so a new press takes over a running fade.
  const fadeTo = useCallback((opacity: number, duration: number, settle: boolean) => {
    const node = element.current
    if (node === null || typeof node.animate !== 'function') return
    const from = getComputedStyle(node).opacity
    animation.current?.cancel()
    const next = node.animate([{ opacity: from }, { opacity: String(opacity) }], {
      duration,
      easing: EASE_IN_OUT_QUAD,
      fill: 'forwards',
    })
    animation.current = next
    // Back at rest, the style's opacity takes over again.
    if (settle) {
      next.onfinish = () => {
        if (animation.current !== next) return
        next.cancel()
        animation.current = null
      }
    }
  }, [])

  const config = useMemo<PressabilityConfig>(
    () => ({
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
      onPress,
      onPressIn: (event) => {
        // As in React Native: at once when the press starts, over 150 ms when the pointer comes
        // back into the press area.
        const starts = event.type === 'pointerdown' || event.type === 'keydown'
        fadeTo(activeOpacity ?? DEFAULT_ACTIVE_OPACITY, starts ? 0 : 150, false)
        onPressIn?.(event)
      },
      onPressOut: (event) => {
        fadeTo(resting, 250, true)
        onPressOut?.(event)
      },
    }),
    [
      activeOpacity,
      delayLongPress,
      delayPressIn,
      delayPressOut,
      fadeTo,
      hitSlop,
      onBlur,
      onFocus,
      onLongPress,
      onPress,
      onPressIn,
      onPressOut,
      pressRetentionOffset,
      rejectResponderTermination,
      resolvedDisabled,
      resting,
      touchSoundDisabled,
    ],
  )
  const handlers = usePressability(config)
  const registry = useStyleRegistry()

  // As in React Native, a change of `disabled` or of the style's opacity fades to rest.
  const previous = useRef({ disabled, resting })
  useEffect(() => {
    if (previous.current.disabled === disabled && previous.current.resting === resting) return
    previous.current = { disabled, resting }
    fadeTo(resting, 250, true)
  }, [disabled, fadeTo, resting])

  useEffect(
    () => () => {
      animation.current?.cancel()
    },
    [],
  )

  const view = useViewElement(
    {
      ...rest,
      ...mergeHandlers(rest, handlers),
      ref: element,
      focusable: focusable !== false && onPress !== undefined && disabled !== true,
      style: [style, rejectResponderTermination === true && notCancelableStyle],
      children,
      ...(resolvedDisabled === true && { 'aria-disabled': true }),
    },
    hitSlopClass(registry, hitSlop),
  )
  // After useViewElement, which fills `element` in its own imperative handle.
  useImperativeHandle(ref, () => element.current as HTMLElement, [])
  return view
}
