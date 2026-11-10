import type { ReactNode, Ref } from 'react'

import type { RectOrSize } from '../../events/press/types'
import type { GestureResponderEvent } from '../../events/types'
import type { StyleProp } from '../../style/types'
import type { AccessibilityProps, DOMEventHandlers, LayoutChangeEvent } from '../View/types'

/** @deprecated Use `GestureResponderEvent`, the type that React Native gives `onPress`. */
export type PressEvent = GestureResponderEvent

export type TextProps = AccessibilityProps &
  DOMEventHandlers<HTMLElement> & {
    children?: ReactNode
    style?: StyleProp<Record<string, unknown>> | undefined
    ref?: Ref<HTMLElement> | undefined
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
