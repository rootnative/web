import type { Ref } from 'react'

import type { GestureResponderEvent } from '../../events/types'
import type { TouchableTVProps } from '../TouchableWithoutFeedback/types'
import type { AccessibilityState, HostInstance } from '../View/types'

export type ButtonProps = TouchableTVProps & {
  // The text of the button. React Native needs a string, and so does the web.
  title: string
  onPress?: ((event: GestureResponderEvent) => unknown) | undefined
  // The background color, as on Android. The default is `#2196F3`.
  color?: string | undefined
  disabled?: boolean | undefined
  testID?: string | undefined
  ref?: Ref<HostInstance> | undefined
  accessible?: boolean | undefined
  accessibilityLabel?: string | undefined
  accessibilityHint?: string | undefined
  // Sets the `lang` attribute.
  accessibilityLanguage?: string | undefined
  accessibilityState?: AccessibilityState | undefined
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants' | undefined
  'aria-busy'?: boolean | undefined
  'aria-checked'?: boolean | 'mixed' | undefined
  'aria-disabled'?: boolean | undefined
  'aria-expanded'?: boolean | undefined
  'aria-label'?: string | undefined
  'aria-selected'?: boolean | undefined
  // The web ignores them.
  accessibilityActions?: ReadonlyArray<{ name: string; label?: string | undefined }> | undefined
  onAccessibilityAction?: ((event: unknown) => unknown) | undefined
  touchSoundDisabled?: boolean | undefined
}
