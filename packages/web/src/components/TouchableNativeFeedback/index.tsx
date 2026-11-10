import { createElement, type ReactElement } from 'react'

import { processColor } from '../../apis/processColor'
import { TouchableWithoutFeedback } from '../TouchableWithoutFeedback'
import type {
  RippleBackgroundPropType,
  ThemeAttributeBackgroundPropType,
  TouchableNativeFeedbackProps,
} from './types'

export type { TouchableNativeFeedbackProps } from './types'

type TouchableNativeFeedbackStatics = {
  SelectableBackground: (rippleRadius?: number | null) => ThemeAttributeBackgroundPropType
  SelectableBackgroundBorderless: (rippleRadius?: number | null) => ThemeAttributeBackgroundPropType
  Ripple: (
    color: string,
    borderless: boolean,
    rippleRadius?: number | null,
  ) => RippleBackgroundPropType
  canUseNativeForeground: () => boolean
}

// The ripple is Android's. Elsewhere React Native shows no feedback, and the press works as on
// TouchableWithoutFeedback. The web does the same as iOS.
export const TouchableNativeFeedback: ((props: TouchableNativeFeedbackProps) => ReactElement) &
  TouchableNativeFeedbackStatics = Object.assign(
  function TouchableNativeFeedback(props: TouchableNativeFeedbackProps): ReactElement {
    const {
      background: _background,
      hasTVPreferredFocus: _hasTVPreferredFocus,
      nextFocusDown: _nextFocusDown,
      nextFocusForward: _nextFocusForward,
      nextFocusLeft: _nextFocusLeft,
      nextFocusRight: _nextFocusRight,
      nextFocusUp: _nextFocusUp,
      useForeground: _useForeground,
      ...rest
    } = props
    return createElement(TouchableWithoutFeedback, rest)
  },
  {
    SelectableBackground: (rippleRadius?: number | null): ThemeAttributeBackgroundPropType => ({
      type: 'ThemeAttrAndroid',
      attribute: 'selectableItemBackground',
      rippleRadius,
    }),
    SelectableBackgroundBorderless: (
      rippleRadius?: number | null,
    ): ThemeAttributeBackgroundPropType => ({
      type: 'ThemeAttrAndroid',
      attribute: 'selectableItemBackgroundBorderless',
      rippleRadius,
    }),
    Ripple: (
      color: string,
      borderless: boolean,
      rippleRadius?: number | null,
    ): RippleBackgroundPropType => ({
      type: 'RippleAndroid',
      color: processColor(color),
      borderless,
      rippleRadius,
    }),
    canUseNativeForeground: (): boolean => false,
  },
)
