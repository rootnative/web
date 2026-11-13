import type { ViewProps } from '../View/types'

export type KeyboardAvoidingViewProps = ViewProps & {
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
export type KeyboardAvoidingViewInstance = HTMLElement
