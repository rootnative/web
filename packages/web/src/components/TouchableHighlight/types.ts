import type { ReactNode } from 'react'

import type { StyleProp } from '../../style/types'
import type { TouchablePressProps, TouchableTVProps } from '../TouchableWithoutFeedback/types'
import type { ViewProps } from '../View/types'

export type TouchableHighlightProps = Omit<ViewProps, 'children' | 'style' | 'onBlur' | 'onFocus'> &
  TouchablePressProps &
  TouchableTVProps & {
    // One element. While pressed, it gets `activeOpacity`.
    children?: ReactNode | undefined
    style?: StyleProp<Record<string, unknown>> | undefined
    // The opacity of the child while pressed. The default is 0.85.
    activeOpacity?: number | undefined
    // The background while pressed. The default is black.
    underlayColor?: string | undefined
    onShowUnderlay?: (() => void) | undefined
    onHideUnderlay?: (() => void) | undefined
    testOnly_pressed?: boolean | undefined
  }
