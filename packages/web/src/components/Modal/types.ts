import type { Ref } from 'react'

import type { ViewProps } from '../View/types'

// React Native sends these events with no data, and so does the web.
export type ModalEvent = { nativeEvent: null }

export type ModalOrientationChangeEvent = {
  nativeEvent: { orientation: 'portrait' | 'landscape' }
}

export type ModalProps = Omit<ViewProps, 'ref'> & {
  // The `<dialog>` element, while the modal shows.
  ref?: Ref<HTMLDialogElement> | undefined
  // The same as `ref`.
  modalRef?: Ref<HTMLDialogElement> | undefined
  // `true` by default, as on native.
  visible?: boolean | undefined
  // The page shows through: the content box gets no background.
  transparent?: boolean | undefined
  // The background of the content box. The default is white. Ignored with `transparent`.
  backdropColor?: string | undefined
  animationType?: 'none' | 'slide' | 'fade' | undefined
  // Escape, or the back gesture of a browser on Android. The app hides the modal.
  onRequestClose?: ((event: ModalEvent) => void) | undefined
  onShow?: ((event: ModalEvent) => void) | undefined
  // iOS on native. Called after the modal hides because `visible` became `false`.
  onDismiss?: (() => void) | undefined
  // Native only. Accepted and ignored.
  allowSwipeDismissal?: boolean | undefined
  hardwareAccelerated?: boolean | undefined
  navigationBarTranslucent?: boolean | undefined
  onOrientationChange?: ((event: ModalOrientationChangeEvent) => void) | undefined
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet' | 'overFullScreen' | undefined
  statusBarTranslucent?: boolean | undefined
  supportedOrientations?:
    | ReadonlyArray<
        'portrait' | 'portrait-upside-down' | 'landscape' | 'landscape-left' | 'landscape-right'
      >
    | undefined
}
