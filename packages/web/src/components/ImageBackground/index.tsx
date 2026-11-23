import type { ReactElement } from 'react'

import { StyleSheet } from '../../apis/StyleSheet'
import { flattenStyle } from '../../style/compile'
import { Image } from '../Image'
import { View } from '../View'
import type { ImageBackgroundProps } from './types'

export type { ImageBackgroundInstance, ImageBackgroundProps } from './types'

/**
 * A view with an image that fills it, under its children, as in React Native 0.88. The image
 * takes the `width` and `height` of the view's style, then `imageStyle`. Each other prop goes to
 * the image, as on native.
 */
export function ImageBackground(props: ImageBackgroundProps): ReactElement {
  const { children, style, imageStyle, imageRef, importantForAccessibility, ref, ...rest } = props
  const flat = flattenStyle(style)
  return (
    <View importantForAccessibility={importantForAccessibility} style={style} ref={ref}>
      <Image
        {...rest}
        importantForAccessibility={importantForAccessibility}
        style={[StyleSheet.absoluteFill, { width: flat?.width, height: flat?.height }, imageStyle]}
        ref={imageRef}
      />
      {children}
    </View>
  )
}
