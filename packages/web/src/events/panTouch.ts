import { useLayoutEffect, type RefObject } from 'react'

// A browser asks the page before it scrolls for a touch that starts on an element with a
// `touchmove` listener that isn't passive. A responder needs one to stop the scroll, so only the
// elements of responders get it: a touch anywhere else scrolls with no wait for the main thread.

// Marks the pointer handlers of a PanResponder, so the element that gets them can add the
// listener when it mounts. Some browsers decide at the touch start if the page may cancel a
// `touchmove`, so a listener that comes with the first touch can be too late for it.
const panMark = Symbol('panHandlers')

export const markPanHandler = <T extends object>(handler: T): T => {
  Object.defineProperty(handler, panMark, { value: true })
  return handler
}

const isPanHandler = (handler: unknown): boolean =>
  typeof handler === 'function' && (handler as { [panMark]?: boolean })[panMark] === true

// The PanResponder module sets the decision, so this module doesn't import it.
let decide: ((event: TouchEvent) => void) | null = null

export const setTouchMoveDecision = (decision: (event: TouchEvent) => void): void => {
  decide = decision
}

const onTouchMove = (event: TouchEvent): void => {
  decide?.(event)
}

const listening = new WeakSet<HTMLElement>()

export const listenForTouchMoveOn = (element: HTMLElement): void => {
  if (listening.has(element)) return
  listening.add(element)
  element.addEventListener('touchmove', onTouchMove, { passive: false })
}

// For a host component: adds the listener at mount when `onPointerDownCapture` is a pan handler.
export const usePanHost = (element: RefObject<HTMLElement | null>, handler: unknown): void => {
  const pan = isPanHandler(handler)
  useLayoutEffect(() => {
    if (pan && element.current !== null) listenForTouchMoveOn(element.current)
  }, [pan, element])
}
