import type { ReactNode } from 'react'

import type { ColorValue, ViewStyle } from '../../apis/StyleSheet/types'
import type { StyleProp } from '../../style/types'
import { warnOnce } from '../../utils/warn'

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface InputAccessoryViewProps {
  children: ReactNode
  nativeID?: string | undefined
  style?: StyleProp<ViewStyle> | undefined
  backgroundColor?: ColorValue | undefined
}

/**
 * A view above the keyboard of a text field, on iOS only. As on Android, it renders nothing and
 * warns.
 */
export function InputAccessoryView(_props: InputAccessoryViewProps): null {
  warnOnce('input-accessory-view', '<InputAccessoryView> is only supported on iOS.')
  return null
}
