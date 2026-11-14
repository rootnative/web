import type { ReactNode, Ref } from 'react'

import type { TextStyle } from '../../apis/StyleSheet/types'
import type { RectOrSize } from '../../events/press/types'
import type { GestureResponderEvent } from '../../events/types'
import type { StyleProp } from '../../style/types'
import type {
  AccessibilityProps,
  DOMEventHandlers,
  HostInstance,
  LayoutChangeEvent,
} from '../View/types'

export type TextInstance = HostInstance

/** @deprecated Use `GestureResponderEvent`, the type that React Native gives `onPress`. */
export type PressEvent = GestureResponderEvent

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface TextProps extends AccessibilityProps, DOMEventHandlers<HTMLElement> {
  children?: ReactNode
  style?: StyleProp<TextStyle> | undefined
  ref?: Ref<TextInstance> | undefined
  id?: string | undefined
  nativeID?: string | undefined
  testID?: string | undefined
  tabIndex?: 0 | -1 | undefined
  disabled?: boolean | undefined
  numberOfLines?: number | undefined
  ellipsizeMode?: 'clip' | 'head' | 'middle' | 'tail' | undefined
  selectable?: boolean | undefined
  selectionColor?: string | undefined
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only' | undefined
  onPress?: ((event: GestureResponderEvent) => void) | undefined
  onPressIn?: ((event: GestureResponderEvent) => void) | undefined
  onPressOut?: ((event: GestureResponderEvent) => void) | undefined
  onLongPress?: ((event: GestureResponderEvent) => void) | undefined
  pressRetentionOffset?: RectOrSize | undefined
  // The web ignores it, as Android does. Only iOS highlights a pressed Text.
  suppressHighlighting?: boolean | undefined
  onLayout?: ((event: LayoutChangeEvent) => void) | undefined
  // Web only. The level of a `heading` role, 1 to 6.
  'aria-level'?: number | undefined
  // Web only. Renders an anchor.
  href?: string | undefined
  target?: '_blank' | '_self' | '_parent' | '_top' | undefined
  rel?: string | undefined
  download?: string | boolean | undefined
  lang?: string | undefined
}
