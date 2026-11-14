import type { HostInstance, ViewProps } from '../View/types'

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface KeyboardAvoidingViewProps extends ViewProps {
  /** How the view moves out of the way of the keyboard. With no value, it doesn't. */
  behavior?: 'height' | 'position' | 'padding' | undefined
  /** The style of the inner view, with the `position` behavior. */
  contentContainerStyle?: ViewProps['style']
  /** `false` stops the view from moving. Defaults to `true`. */
  enabled?: boolean | undefined
  /** The distance between the top of the window and the top of the view. Defaults to 0. */
  keyboardVerticalOffset?: number | undefined
}

/** The element of the outer view. */
export type KeyboardAvoidingViewInstance = HostInstance
