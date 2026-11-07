import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'

import type { BlurEvent, FocusEvent, GestureResponderEvent, MouseEvent } from '../types'

export type Rect = Readonly<{
  bottom?: number | undefined
  left?: number | undefined
  right?: number | undefined
  top?: number | undefined
}>

export type Insets = Rect

export type RectOrSize = Rect | number

export type PressabilityConfig = Readonly<{
  // The web ignores it. The browser cancels a touch press when the page starts to scroll.
  cancelable?: boolean | undefined
  disabled?: boolean | undefined
  hitSlop?: RectOrSize | undefined
  pressRectOffset?: RectOrSize | undefined
  // The web ignores it.
  android_disableSound?: boolean | undefined
  delayHoverIn?: number | undefined
  delayHoverOut?: number | undefined
  delayLongPress?: number | undefined
  delayPressIn?: number | undefined
  delayPressOut?: number | undefined
  minPressDuration?: number | undefined
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
}>

// DOM handlers, in place of the native responder handlers. Spread them on a View.
export type PressabilityEventHandlers = Readonly<{
  onBlur: (event: ReactFocusEvent<HTMLElement>) => void
  onClick: (event: ReactMouseEvent<HTMLElement>) => void
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void
  onFocus: (event: ReactFocusEvent<HTMLElement>) => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
  onKeyUp: (event: ReactKeyboardEvent<HTMLElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerEnter: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
}>
