import type { ReactNode } from 'react'

import type { StyleProp } from '../../style/types'
import type { TouchablePressProps, TouchableTVProps } from '../TouchableWithoutFeedback/types'
import type { ViewProps } from '../View/types'

export type TouchableOpacityProps = Omit<ViewProps, 'children' | 'style' | 'onBlur' | 'onFocus'> &
  TouchablePressProps &
  TouchableTVProps & {
    children?: ReactNode | undefined
    style?: StyleProp<Record<string, unknown>> | undefined
    // The opacity while pressed. The default is 0.2.
    activeOpacity?: number | undefined
  }
