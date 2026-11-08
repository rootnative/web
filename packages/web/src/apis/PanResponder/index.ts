import type { PointerEvent as ReactPointerEvent } from 'react'

import type { GestureResponderEvent, NativeTouchEvent } from '../../events/types'

export type PanResponderGestureState = {
  stateID: number
  moveX: number
  moveY: number
  x0: number
  y0: number
  dx: number
  dy: number
  vx: number
  vy: number
  numberActiveTouches: number
  _accountsForMovesUpTo: number
}

type Callback = (event: GestureResponderEvent, gestureState: PanResponderGestureState) => void
type Predicate = (event: GestureResponderEvent, gestureState: PanResponderGestureState) => boolean

export type PanResponderCallbacks = {
  onStartShouldSetPanResponder?: Predicate | undefined
  onStartShouldSetPanResponderCapture?: Predicate | undefined
  onMoveShouldSetPanResponder?: Predicate | undefined
  onMoveShouldSetPanResponderCapture?: Predicate | undefined
  onPanResponderGrant?: Callback | undefined
  onPanResponderStart?: Callback | undefined
  onPanResponderMove?: Callback | undefined
  onPanResponderEnd?: Callback | undefined
  onPanResponderRelease?: Callback | undefined
  onPanResponderReject?: Callback | undefined
  onPanResponderTerminate?: Callback | undefined
  onPanResponderTerminationRequest?: Predicate | undefined
  onShouldBlockNativeResponder?: Predicate | undefined
}

type Handler = (event: ReactPointerEvent<HTMLElement>) => void

// Pointer handlers. Spread them on a View.
export type GestureResponderHandlers = {
  onPointerDownCapture: Handler
  onPointerDown: Handler
  onPointerMoveCapture: Handler
  onPointerMove: Handler
  onPointerUp: Handler
  onPointerCancel: Handler
}

export type PanResponderInstance = {
  panHandlers: GestureResponderHandlers
  getInteractionHandle: () => number | null
}

type Pointer = { id: number; clientX: number; clientY: number; target: EventTarget | null }

type Responder = {
  config: PanResponderCallbacks
  gestureState: PanResponderGestureState
  pointers: Map<number, Pointer>
  element: HTMLElement | null
  last: { x: number; y: number; time: number } | null
}

// One responder at a time, as in React Native's responder system.
let current: Responder | null = null
// The DOM event that granted the current responder, so no other responder
// asks again during the same dispatch.
let grantEvent: Event | null = null

let nextStateID = 1

const newGestureState = (): PanResponderGestureState => ({
  stateID: nextStateID++,
  moveX: 0,
  moveY: 0,
  x0: 0,
  y0: 0,
  dx: 0,
  dy: 0,
  vx: 0,
  vy: 0,
  numberActiveTouches: 0,
  _accountsForMovesUpTo: 0,
})

const centroid = (pointers: Map<number, Pointer>): { x: number; y: number } => {
  let x = 0
  let y = 0
  for (const pointer of pointers.values()) {
    x += pointer.clientX + window.scrollX
    y += pointer.clientY + window.scrollY
  }
  const count = pointers.size || 1
  return { x: x / count, y: y / count }
}

const define = (target: object, fields: Record<string, unknown>): void => {
  for (const key in fields) {
    Object.defineProperty(target, key, { value: fields[key], configurable: true, writable: true })
  }
}

const touchOf = (pointer: Pointer, rect: DOMRect, timestamp: number): NativeTouchEvent => ({
  changedTouches: [],
  identifier: pointer.id,
  locationX: pointer.clientX - rect.left,
  locationY: pointer.clientY - rect.top,
  pageX: pointer.clientX + window.scrollX,
  pageY: pointer.clientY + window.scrollY,
  target: pointer.target,
  timestamp,
  touches: [],
})

// Adds the React Native touch fields to the DOM pointer event. `touches` lists
// every active pointer of this responder, `changedTouches` the one that moved.
const toResponderEvent = (
  event: ReactPointerEvent<HTMLElement>,
  responder: Responder,
  changed: Pointer,
): GestureResponderEvent => {
  const element = responder.element ?? event.currentTarget
  const rect = element.getBoundingClientRect()
  const touches = [...responder.pointers.values()].map((p) => touchOf(p, rect, event.timeStamp))
  const touch = touchOf(changed, rect, event.timeStamp)
  define(event.nativeEvent, {
    ...touch,
    force: event.pressure,
    touches,
    changedTouches: [touch],
  })
  return event as unknown as GestureResponderEvent
}

const pointerOf = (event: ReactPointerEvent<HTMLElement>): Pointer => ({
  id: event.pointerId,
  clientX: event.clientX,
  clientY: event.clientY,
  target: event.target,
})

const updateMove = (responder: Responder, time: number): void => {
  const state = responder.gestureState
  const next = centroid(responder.pointers)
  const last = responder.last
  if (last !== null) {
    const dt = time - last.time
    state.dx += next.x - last.x
    state.dy += next.y - last.y
    state.vx = dt > 0 ? (next.x - last.x) / dt : 0
    state.vy = dt > 0 ? (next.y - last.y) / dt : 0
  }
  state.moveX = next.x
  state.moveY = next.y
  state._accountsForMovesUpTo = time
  responder.last = { x: next.x, y: next.y, time }
}

// A pointer joined or left: the centroid moves, but the gesture did not.
const rebase = (responder: Responder, time: number): void => {
  const next = centroid(responder.pointers)
  responder.last = { x: next.x, y: next.y, time }
  responder.gestureState.numberActiveTouches = responder.pointers.size
}

const grant = (
  responder: Responder,
  event: ReactPointerEvent<HTMLElement>,
  responderEvent: GestureResponderEvent,
): void => {
  const state = responder.gestureState
  const point = centroid(responder.pointers)
  state.x0 = point.x
  state.y0 = point.y
  state.dx = 0
  state.dy = 0
  state.vx = 0
  state.vy = 0
  responder.last = { x: point.x, y: point.y, time: event.timeStamp }
  responder.element = event.currentTarget
  current = responder
  grantEvent = event.nativeEvent
  for (const pointer of responder.pointers.values()) {
    try {
      responder.element.setPointerCapture(pointer.id)
    } catch {
      // The pointer is gone, or synthetic.
    }
  }
  responder.config.onPanResponderGrant?.(responderEvent, state)
  responder.config.onPanResponderStart?.(responderEvent, state)
}

const releaseCapture = (responder: Responder): void => {
  const element = responder.element
  if (element === null) return
  for (const pointer of responder.pointers.values()) {
    try {
      if (element.hasPointerCapture(pointer.id)) element.releasePointerCapture(pointer.id)
    } catch {
      // Not captured.
    }
  }
}

const finish = (responder: Responder): void => {
  releaseCapture(responder)
  if (current === responder) current = null
  responder.element = null
  responder.last = null
}

// Asks a should-set callback and, on yes, negotiates with the current responder.
const negotiate = (
  responder: Responder,
  event: ReactPointerEvent<HTMLElement>,
  responderEvent: GestureResponderEvent,
  predicate: Predicate | undefined,
): void => {
  if (current === responder) return
  if (current !== null && grantEvent === event.nativeEvent) return
  if (predicate === undefined || !predicate(responderEvent, responder.gestureState)) return

  if (current !== null) {
    const holder = current
    const allowed = holder.config.onPanResponderTerminationRequest?.(
      responderEvent,
      holder.gestureState,
    )
    if (allowed === false) {
      responder.config.onPanResponderReject?.(responderEvent, responder.gestureState)
      return
    }
    holder.config.onPanResponderTerminate?.(responderEvent, holder.gestureState)
    finish(holder)
  }
  grant(responder, event, responderEvent)
}

const createHandlers = (responder: Responder): GestureResponderHandlers => {
  const down = (event: ReactPointerEvent<HTMLElement>, capture: boolean): void => {
    const pointer = pointerOf(event)
    const first = responder.pointers.size === 0
    if (capture) {
      if (first) responder.gestureState = newGestureState()
      responder.pointers.set(pointer.id, pointer)
      rebase(responder, event.timeStamp)
    }
    const responderEvent = toResponderEvent(event, responder, pointer)
    const { config } = responder
    if (current === responder) {
      if (capture) config.onPanResponderStart?.(responderEvent, responder.gestureState)
      return
    }
    negotiate(
      responder,
      event,
      responderEvent,
      capture ? config.onStartShouldSetPanResponderCapture : config.onStartShouldSetPanResponder,
    )
  }

  const move = (event: ReactPointerEvent<HTMLElement>, capture: boolean): void => {
    const pointer = responder.pointers.get(event.pointerId)
    if (pointer === undefined) return
    if (capture) {
      pointer.clientX = event.clientX
      pointer.clientY = event.clientY
      updateMove(responder, event.timeStamp)
    }
    const responderEvent = toResponderEvent(event, responder, pointer)
    const { config } = responder
    if (current === responder) {
      if (capture) config.onPanResponderMove?.(responderEvent, responder.gestureState)
      return
    }
    negotiate(
      responder,
      event,
      responderEvent,
      capture ? config.onMoveShouldSetPanResponderCapture : config.onMoveShouldSetPanResponder,
    )
  }

  const end = (event: ReactPointerEvent<HTMLElement>, cancel: boolean): void => {
    const pointer = responder.pointers.get(event.pointerId)
    if (pointer === undefined) return
    const responderEvent = toResponderEvent(event, responder, pointer)
    responder.pointers.delete(event.pointerId)
    const { config, gestureState } = responder
    const responding = current === responder
    if (responding && cancel) {
      config.onPanResponderTerminate?.(responderEvent, gestureState)
      responder.pointers.clear()
      finish(responder)
      return
    }
    if (responding) config.onPanResponderEnd?.(responderEvent, gestureState)
    if (responder.pointers.size === 0) {
      if (responding) config.onPanResponderRelease?.(responderEvent, gestureState)
      finish(responder)
    } else {
      rebase(responder, event.timeStamp)
    }
  }

  return {
    onPointerDownCapture: (event) => down(event, true),
    onPointerDown: (event) => down(event, false),
    onPointerMoveCapture: (event) => move(event, true),
    onPointerMove: (event) => move(event, false),
    onPointerUp: (event) => end(event, false),
    onPointerCancel: (event) => end(event, true),
  }
}

export const PanResponder: {
  create: (config: PanResponderCallbacks) => PanResponderInstance
} = {
  create(config) {
    const responder: Responder = {
      config,
      gestureState: newGestureState(),
      pointers: new Map(),
      element: null,
      last: null,
    }
    return {
      panHandlers: createHandlers(responder),
      // No interaction manager on the web.
      getInteractionHandle: () => null,
    }
  },
}

// For tests.
export const resetPanResponder = (): void => {
  current = null
  grantEvent = null
}
