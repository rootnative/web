import type { ReactNode } from 'react'

import type { ViewStyle } from '../../apis/StyleSheet/types'
import type { RectOrSize } from '../../events/press/types'
import type { BlurEvent, FocusEvent, GestureResponderEvent } from '../../events/types'
import type { StyleProp } from '../../style/types'
import type { AccessibilityProps, LayoutChangeEvent } from '../View/types'

// The press props that every Touchable shares.
export type TouchablePressProps = {
  delayLongPress?: number | undefined
  delayPressIn?: number | undefined
  delayPressOut?: number | undefined
  disabled?: boolean | undefined
  hitSlop?: RectOrSize | undefined
  onBlur?: ((event: BlurEvent) => unknown) | undefined
  onFocus?: ((event: FocusEvent) => unknown) | undefined
  onLongPress?: ((event: GestureResponderEvent) => unknown) | undefined
  onPress?: ((event: GestureResponderEvent) => unknown) | undefined
  onPressIn?: ((event: GestureResponderEvent) => unknown) | undefined
  onPressOut?: ((event: GestureResponderEvent) => unknown) | undefined
  pressRetentionOffset?: RectOrSize | undefined
  rejectResponderTermination?: boolean | undefined
  // The web ignores it.
  touchSoundDisabled?: boolean | undefined
}

// TV only. The web ignores them.
export type TouchableTVProps = {
  hasTVPreferredFocus?: boolean | undefined
  nextFocusDown?: number | undefined
  nextFocusForward?: number | undefined
  nextFocusLeft?: number | undefined
  nextFocusRight?: number | undefined
  nextFocusUp?: number | undefined
}

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface TouchableWithoutFeedbackProps extends AccessibilityProps, TouchablePressProps {
  children?: ReactNode | undefined
  focusable?: boolean | undefined
  id?: string | undefined
  nativeID?: string | undefined
  testID?: string | undefined
  onLayout?: ((event: LayoutChangeEvent) => unknown) | undefined
  // React Native doesn't pass it to the child, and neither does the web.
  style?: StyleProp<ViewStyle> | undefined
}
