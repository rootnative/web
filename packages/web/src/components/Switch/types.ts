import type { Ref } from 'react'

import type { NativeSyntheticEvent } from '../../events/types'
import type { ViewProps } from '../View/types'

export type SwitchChangeEventData = {
  value: boolean
  target: EventTarget | null
}
export type SwitchChangeEvent = NativeSyntheticEvent<SwitchChangeEventData>

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface SwitchProps extends Omit<ViewProps, 'children' | 'onChange' | 'ref'> {
  ref?: Ref<HTMLInputElement> | undefined
  // Only `true` turns the switch on. The switch shows this value, also after a press.
  value?: boolean | undefined
  disabled?: boolean | undefined
  onChange?: ((event: SwitchChangeEvent) => unknown) | undefined
  onValueChange?: ((value: boolean) => unknown) | undefined
  // The color of the thumb in both states.
  thumbColor?: string | undefined
  // The color of the track when the switch is off (`false`) and on (`true`).
  trackColor?:
    Readonly<{ false?: string | null | undefined; true?: string | null | undefined }> | undefined
  // iOS only. The web ignores them, as Android does.
  ios_backgroundColor?: string | undefined
  onTintColor?: string | undefined
  thumbTintColor?: string | undefined
  tintColor?: string | undefined
}
