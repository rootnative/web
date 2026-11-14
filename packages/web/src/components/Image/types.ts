import type { HTMLAttributeReferrerPolicy, Ref } from 'react'

import type { ImageResizeMode, ImageStyle } from '../../apis/StyleSheet/types'
import type { StyleProp } from '../../style/types'
import type {
  AccessibilityProps,
  DOMEventHandlers,
  HostInstance,
  LayoutChangeEvent,
} from '../View/types'

export type ImageInstance = HostInstance

export type { ImageResizeMode } from '../../apis/StyleSheet/types'

export type ImageURISource = {
  uri?: string | undefined
  bundle?: string | undefined
  method?: string | undefined
  headers?: Record<string, string> | undefined
  body?: string | undefined
  cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached' | undefined
  width?: number | undefined
  height?: number | undefined
  scale?: number | undefined
}

// A number is a Metro asset id, which has no meaning on the web. A string is
// the URL a web bundler gives for an imported image file.
export type ImageSource = ImageURISource | ReadonlyArray<ImageURISource> | number | string

export type ImageResolvedAssetSource = {
  uri: string
  width?: number | undefined
  height?: number | undefined
  scale: number
}

export type ImageLoadEventData = { source: { uri: string; width: number; height: number } }

export type ImageLoadEvent = { nativeEvent: ImageLoadEventData }

export type ImageErrorEvent = { nativeEvent: { error: string } }

export type ImageProgressEvent = { nativeEvent: { loaded: number; total: number } }

export type ImageSize = { width: number; height: number }

type ReservedDOMHandlers = 'onLoad' | 'onLoadStart' | 'onError' | 'onProgress'

// An interface, as in React Native, so a library can add props with a module augmentation.
export interface ImageProps
  extends AccessibilityProps, Omit<DOMEventHandlers<HTMLElement>, ReservedDOMHandlers> {
  source?: ImageSource | undefined
  src?: string | undefined
  srcSet?: string | undefined
  alt?: string | undefined
  defaultSource?: ImageURISource | number | string | undefined
  resizeMode?: ImageResizeMode | undefined
  resizeMethod?: 'auto' | 'resize' | 'scale' | 'none' | undefined
  blurRadius?: number | undefined
  tintColor?: unknown
  width?: number | undefined
  height?: number | undefined
  crossOrigin?: 'anonymous' | 'use-credentials' | undefined
  referrerPolicy?: HTMLAttributeReferrerPolicy | undefined
  fadeDuration?: number | undefined
  progressiveRenderingEnabled?: boolean | undefined
  loadingIndicatorSource?: ImageURISource | number | undefined
  style?: StyleProp<ImageStyle> | undefined
  ref?: Ref<ImageInstance> | undefined
  id?: string | undefined
  nativeID?: string | undefined
  testID?: string | undefined
  onLayout?: ((event: LayoutChangeEvent) => void) | undefined
  onLoad?: ((event: ImageLoadEvent) => void) | undefined
  onLoadStart?: (() => void) | undefined
  onLoadEnd?: (() => void) | undefined
  onError?: ((event: ImageErrorEvent) => void) | undefined
  onProgress?: ((event: ImageProgressEvent) => void) | undefined
  // Web only. The three `<img>` loading hints.
  loading?: 'eager' | 'lazy' | undefined
  fetchPriority?: 'high' | 'low' | 'auto' | undefined
  decoding?: 'sync' | 'async' | 'auto' | undefined
}

export type ImageStatics = {
  getSize: {
    (uri: string): Promise<ImageSize>
    (
      uri: string,
      success: (width: number, height: number) => void,
      failure?: (error: unknown) => void,
    ): void
  }
  getSizeWithHeaders: {
    (uri: string, headers: Record<string, string>): Promise<ImageSize>
    (
      uri: string,
      headers: Record<string, string>,
      success: (width: number, height: number) => void,
      failure?: (error: unknown) => void,
    ): void
  }
  prefetch: (url: string) => Promise<boolean>
  queryCache: (
    urls: ReadonlyArray<string>,
  ) => Promise<Record<string, 'memory' | 'disk' | 'disk/memory'>>
  resolveAssetSource: (source: ImageSource | undefined) => ImageResolvedAssetSource | null
}
