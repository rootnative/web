import { useEffect, useRef, type RefObject } from 'react'

import type { LayoutChangeEvent } from '../components/View/types'

const measure = (element: HTMLElement): LayoutChangeEvent => ({
  nativeEvent: {
    layout: {
      x: element.offsetLeft,
      y: element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight,
    },
  },
})

// Calls onLayout after mount and after each size change, as native does.
export const useElementLayout = (
  ref: RefObject<HTMLElement | null>,
  onLayout: ((event: LayoutChangeEvent) => void) | undefined,
): void => {
  const latest = useRef(onLayout)
  useEffect(() => {
    latest.current = onLayout
  }, [onLayout])

  const enabled = onLayout !== undefined
  useEffect(() => {
    const element = ref.current
    if (element === null || !enabled) return

    const observer = new ResizeObserver(() => latest.current?.(measure(element)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, enabled])
}
