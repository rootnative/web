import type { ReactNode } from 'react'

import type { StyleProp } from '../../style/types'
import type { TouchablePressProps } from '../TouchableWithoutFeedback/types'
import type { ViewProps } from '../View/types'

export type TouchableOpacityProps = Omit<ViewProps, 'children' | 'style' | 'onBlur' | 'onFocus'> &
  TouchablePressProps & {
    children?: ReactNode | undefined
    style?: StyleProp<Record<string, unknown>> | undefined
    // The opacity while pressed. The default is 0.2.
    activeOpacity?: number | undefined
    // TV only. The web ignores them.
    hasTVPreferredFocus?: boolean | undefined
    nextFocusDown?: number | undefined
    nextFocusForward?: number | undefined
    nextFocusLeft?: number | undefined
    nextFocusRight?: number | undefined
    nextFocusUp?: number | undefined
  }
