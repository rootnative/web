import { act } from 'react'

// Firefox and Safari on a desktop can't build touch events, so touch tests run where the engine can.
// Desktop WebKit has a `Touch` function, but `new Touch()` throws, so only a real build tells.
export const canTouch: boolean = ((): boolean => {
  try {
    return new Touch({ identifier: 0, target: document.body }) instanceof Touch
  } catch {
    return false
  }
})()

// Sends one touch event of a single finger at (x, y) on the target and returns it.
export const sendTouch = (target: Element, type: string, x: number, y: number): TouchEvent => {
  const point = new Touch({ identifier: 7, target, clientX: x, clientY: y })
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    touches: type === 'touchend' || type === 'touchcancel' ? [] : [point],
    changedTouches: [point],
  })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}
