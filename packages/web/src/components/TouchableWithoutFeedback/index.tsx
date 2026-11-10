import { Children, cloneElement, useMemo, type ReactElement } from 'react'

import { usePressability } from '../../events/press'
import { mergeHandlers } from '../../events/press/mergeHandlers'
import type { PressabilityConfig } from '../../events/press/types'
import type { BlurEvent, FocusEvent } from '../../events/types'
import type { TouchableWithoutFeedbackProps } from './types'

export type { TouchableWithoutFeedbackProps } from './types'

type ChildProps = Record<string, unknown> & {
  onBlur?: ((event: BlurEvent) => unknown) | undefined
  onFocus?: ((event: FocusEvent) => unknown) | undefined
}

const isTrue = (value: unknown): boolean | undefined =>
  value === undefined ? undefined : value === true || value === 'true'

// Renders no element of its own. As in React Native, it gives its only child the press
// handlers and its accessibility props.
export function TouchableWithoutFeedback(props: TouchableWithoutFeedbackProps): ReactElement {
  const {
    children,
    delayLongPress,
    delayPressIn,
    delayPressOut,
    disabled,
    focusable,
    hitSlop,
    onBlur,
    onFocus,
    onLongPress,
    onPress,
    onPressIn,
    onPressOut,
    pressRetentionOffset,
    rejectResponderTermination,
    style: _style,
    touchSoundDisabled,
    ...rest
  } = props

  const resolvedDisabled =
    disabled ?? isTrue(props['aria-disabled']) ?? props.accessibilityState?.disabled

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
      onPressIn,
      onPressOut,
    }),
    [
      delayLongPress,
      delayPressIn,
      delayPressOut,
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
      touchSoundDisabled,
    ],
  )
  const handlers = usePressability(config)

  const element = Children.only(children) as ReactElement<ChildProps>
  const passed: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(rest)) {
    if (value !== undefined) passed[name] = value
  }
  if (hitSlop !== undefined) passed['hitSlop'] = hitSlop
  if (disabled != null) passed['accessibilityState'] = { ...rest.accessibilityState, disabled }

  const merged = mergeHandlers(element.props, handlers)
  // As in React Native, a focus handler of the Touchable replaces the one of the child. With
  // none, the child keeps its own.
  const childFocus = onFocus === undefined ? element.props.onFocus : undefined
  const childBlur = onBlur === undefined ? element.props.onBlur : undefined

  return cloneElement(element, {
    ...passed,
    ...merged,
    onFocus:
      childFocus === undefined
        ? merged.onFocus
        : (event: FocusEvent) => {
            merged.onFocus(event)
            childFocus(event)
          },
    onBlur:
      childBlur === undefined
        ? merged.onBlur
        : (event: BlurEvent) => {
            merged.onBlur(event)
            childBlur(event)
          },
    accessible: rest.accessible !== false,
    focusable: focusable !== false && onPress !== undefined && disabled !== true,
  })
}
