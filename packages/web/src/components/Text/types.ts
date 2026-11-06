import type { ReactNode, Ref, SyntheticEvent } from 'react'

import type { StyleProp } from '../../style/types'
import type { AccessibilityProps, DOMEventHandlers, LayoutChangeEvent } from '../View/types'

export type PressEvent = SyntheticEvent<HTMLElement>

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
    onPress?: ((event: PressEvent) => void) | undefined
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
