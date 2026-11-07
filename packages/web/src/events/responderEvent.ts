import type { SyntheticEvent } from 'react'

import type { GestureResponderEvent, MouseEvent, NativeTouchEvent } from './types'

type DOMEvent = Event & {
  clientX?: number
  clientY?: number
  detail?: number
  pointerId?: number
  pressure?: number
}

// A click from the keyboard, assistive technology, or element.click() has detail 0, and its
// clientX and clientY are 0, not the point of a pointer.
const hasPoint = (event: DOMEvent): boolean =>
  event.clientX !== undefined && !(event.type === 'click' && event.detail === 0)

const activeTypes = new Set(['pointerdown', 'pointermove', 'keydown'])

const define = (target: object, fields: Record<string, unknown>): void => {
  for (const key in fields) {
    if (key in target) continue
    Object.defineProperty(target, key, { value: fields[key], configurable: true })
  }
}

// Adds the React Native touch fields to the DOM event in place, so code that reads
// `nativeEvent.locationX` works. A keyboard or focus event has no point, so it uses the
// center of the element.
export const toGestureResponderEvent = (
  event: SyntheticEvent<HTMLElement>,
  element: HTMLElement,
): GestureResponderEvent => {
  const native = event.nativeEvent as DOMEvent
  if (!('locationX' in native)) {
    const rect = element.getBoundingClientRect()
    const point = hasPoint(native)
    const clientX = point ? (native.clientX ?? 0) : rect.left + rect.width / 2
    const clientY = point ? (native.clientY ?? 0) : rect.top + rect.height / 2
    const touch: NativeTouchEvent = {
      changedTouches: [],
      force: native.pressure,
      identifier: native.pointerId ?? 0,
      locationX: clientX - rect.left,
      locationY: clientY - rect.top,
      pageX: clientX + window.scrollX,
      pageY: clientY + window.scrollY,
      target: native.target,
      timestamp: event.timeStamp,
      touches: [],
    }
    define(native, {
      ...touch,
      changedTouches: [touch],
      touches: activeTypes.has(native.type) ? [touch] : [],
    })
  }
  return event as unknown as GestureResponderEvent
}

export const toMouseEvent = (event: SyntheticEvent<HTMLElement>): MouseEvent => {
  define(event.nativeEvent, { timestamp: event.timeStamp })
  return event as unknown as MouseEvent
}
