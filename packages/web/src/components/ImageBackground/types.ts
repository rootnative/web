import type { ReactNode, Ref } from 'react'

import type { ImageStyle, ViewStyle } from '../../apis/StyleSheet/types'
import type { StyleProp } from '../../style/types'
import type { ImageInstance, ImageProps } from '../Image/types'
import type { HostInstance } from '../View/types'

/** The element of the outer view. */
export type ImageBackgroundInstance = HostInstance

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface ImageBackgroundProps extends Omit<ImageProps, 'children' | 'style' | 'ref'> {
  children?: ReactNode | undefined
  /** The style of the outer view. Its `width` and `height` also size the image. */
  style?: StyleProp<ViewStyle> | undefined
  /** The style of the image, which fills the view under the children. */
  imageStyle?: StyleProp<ImageStyle> | undefined
  /** A ref to the image. */
  imageRef?: Ref<ImageInstance> | undefined
  ref?: Ref<ImageBackgroundInstance> | undefined
}
