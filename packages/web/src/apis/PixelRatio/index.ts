import { Dimensions } from '../Dimensions'

export const PixelRatio: {
  get: () => number
  getFontScale: () => number
  getPixelSizeForLayoutSize: (layoutSize: number) => number
  roundToNearestPixel: (layoutSize: number) => number
  startDetecting: () => void
} = {
  get: () => Dimensions.get('window').scale,

  getFontScale: () => Dimensions.get('window').fontScale,

  getPixelSizeForLayoutSize: (layoutSize) => Math.round(layoutSize * PixelRatio.get()),

  roundToNearestPixel: (layoutSize) => {
    const ratio = PixelRatio.get()
    return Math.round(layoutSize * ratio) / ratio
  },

  // The browser reports the ratio itself. Nothing to start.
  startDetecting: () => {},
}
