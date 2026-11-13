import type { ReactNode } from 'react'

import type { ViewStyle } from '../../apis/StyleSheet/types'
import type { RectOrSize } from '../../events/press/types'
import type { BlurEvent, FocusEvent, GestureResponderEvent, MouseEvent } from '../../events/types'
import type { StyleProp } from '../../style/types'
import type { HostInstance, ViewProps } from '../View/types'

export interface PressableStateCallbackType {
  readonly pressed: boolean
  // Web only. True while a mouse or a pen is over the element.
  readonly hovered: boolean
  // Web only. True while the element has keyboard focus (`:focus-visible`), so a focus ring
  // does not show after a mouse click.
  readonly focused: boolean
}

// The web ignores it.
export type PressableAndroidRippleConfig = {
  color?: string | undefined
  borderless?: boolean | undefined
  radius?: number | undefined
  foreground?: boolean | undefined
}

export type PressableInstance = HostInstance

export type PressableProps = Omit<ViewProps, 'children' | 'style' | 'onBlur' | 'onFocus'> & {
  children?: ReactNode | ((state: PressableStateCallbackType) => ReactNode) | undefined
  style?:
    StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>) | undefined
  // `false` sets `touch-action: none`, so a scroll that starts on the element cannot cancel
  // the press.
  cancelable?: boolean | undefined
  delayHoverIn?: number | undefined
  delayHoverOut?: number | undefined
  delayLongPress?: number | undefined
  disabled?: boolean | undefined
  hitSlop?: RectOrSize | undefined
  pressRetentionOffset?: RectOrSize | undefined
  onBlur?: ((event: BlurEvent) => unknown) | undefined
  onFocus?: ((event: FocusEvent) => unknown) | undefined
  onHoverIn?: ((event: MouseEvent) => unknown) | undefined
  onHoverOut?: ((event: MouseEvent) => unknown) | undefined
  onLongPress?: ((event: GestureResponderEvent) => unknown) | undefined
  onPress?: ((event: GestureResponderEvent) => unknown) | undefined
  onPressIn?: ((event: GestureResponderEvent) => unknown) | undefined
  onPressMove?: ((event: GestureResponderEvent) => unknown) | undefined
  onPressOut?: ((event: GestureResponderEvent) => unknown) | undefined
  // The web ignores it.
  blockNativeResponder?: boolean | undefined
  // The web ignores it.
  android_disableSound?: boolean | undefined
  android_ripple?: PressableAndroidRippleConfig | undefined
  testOnly_pressed?: boolean | undefined
  unstable_pressDelay?: number | undefined
}
