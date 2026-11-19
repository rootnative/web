import type { NativeScrollEvent } from './types'

export const describeScroll = (element: HTMLElement): NativeScrollEvent => ({
  contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
  contentOffset: { x: element.scrollLeft, y: element.scrollTop },
  contentSize: { width: element.scrollWidth, height: element.scrollHeight },
  layoutMeasurement: { width: element.clientWidth, height: element.clientHeight },
  zoomScale: 1,
})
