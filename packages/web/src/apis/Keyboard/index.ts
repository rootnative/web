import type { EventSubscription } from '../../events/types'
import { hasDOM } from '../../utils/env'

export type KeyboardEventName =
  | 'keyboardWillShow'
  | 'keyboardDidShow'
  | 'keyboardWillHide'
  | 'keyboardDidHide'
  | 'keyboardWillChangeFrame'
  | 'keyboardDidChangeFrame'

export type KeyboardEventEasing = 'easeIn' | 'easeInEaseOut' | 'easeOut' | 'linear' | 'keyboard'

export type KeyboardMetrics = Readonly<{
  screenX: number
  screenY: number
  width: number
  height: number
}>

export type AndroidKeyboardEvent = Readonly<{
  duration: 0
  easing: 'keyboard'
  endCoordinates: KeyboardMetrics
}>

export type IOSKeyboardEvent = Readonly<{
  duration: number
  easing: KeyboardEventEasing
  endCoordinates: KeyboardMetrics
  startCoordinates: KeyboardMetrics
  isEventFromThisApp: boolean
}>

export type KeyboardEvent = AndroidKeyboardEvent | IOSKeyboardEvent

type Listener = (event: KeyboardEvent) => unknown

type VirtualKeyboard = EventTarget & { overlaysContent: boolean; boundingRect: DOMRectReadOnly }

/**
 * Internal. Where the keyboard module reads the two browser objects. A test replaces them,
 * because a headless browser shows no keyboard.
 */
export const keyboardSources: {
  visualViewport: () => VisualViewport | null
  virtualKeyboard: () => VirtualKeyboard | undefined
} = {
  visualViewport: () => window.visualViewport,
  virtualKeyboard: () => (navigator as { virtualKeyboard?: VirtualKeyboard }).virtualKeyboard,
}

const listeners = new Map<string, Set<Listener>>()
// The objects that have our listeners, so the same ones lose them again.
let observed: {
  viewport: VisualViewport | null
  virtualKeyboard: VirtualKeyboard | undefined
} | null = null
let current: KeyboardMetrics | null = null
let frame: number | null = null

// The input types that take no text, so the browser shows no keyboard for them.
const noTextInputTypes = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

const isEditable = (element: Element | null): element is HTMLElement => {
  if (element instanceof HTMLTextAreaElement) return !element.readOnly && !element.disabled
  if (element instanceof HTMLInputElement) {
    return !element.readOnly && !element.disabled && !noTextInputTypes.has(element.type)
  }
  return element instanceof HTMLElement && element.isContentEditable
}

// The keyboard as the browser shows it now, or null.
const read = (): KeyboardMetrics | null => {
  if (!hasDOM()) return null
  const root = document.documentElement

  // An app that sets `overlaysContent` gets a keyboard over the page, and its exact rectangle.
  const virtualKeyboard = keyboardSources.virtualKeyboard()
  if (virtualKeyboard?.overlaysContent === true) {
    const { x, y, width, height } = virtualKeyboard.boundingRect
    return height > 0 ? { screenX: x, screenY: y, width, height } : null
  }

  // Else the keyboard covers the page, and the visual viewport shrinks by its height. A pinch
  // zoom shrinks the visual viewport too, so its height counts at a scale of 1. Without a focused
  // text field, a smaller viewport has another cause.
  const viewport = keyboardSources.visualViewport()
  if (viewport === null || !isEditable(document.activeElement)) return null
  const height = Math.round(root.clientHeight - viewport.height * viewport.scale)
  if (height <= 0) return null
  return { screenX: 0, screenY: root.clientHeight - height, width: root.clientWidth, height }
}

const hiddenMetrics = (): KeyboardMetrics => ({
  screenX: 0,
  screenY: hasDOM() ? document.documentElement.clientHeight : 0,
  width: hasDOM() ? document.documentElement.clientWidth : 0,
  height: 0,
})

// As on Android: a duration of 0 and the `keyboard` easing.
const toEvent = (endCoordinates: KeyboardMetrics): AndroidKeyboardEvent => ({
  duration: 0,
  easing: 'keyboard',
  endCoordinates,
})

const sameMetrics = (a: KeyboardMetrics | null, b: KeyboardMetrics | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.screenX === b.screenX &&
    a.screenY === b.screenY &&
    a.width === b.width &&
    a.height === b.height)

const emit = (name: KeyboardEventName, event: KeyboardEvent): void => {
  const set = listeners.get(name)
  if (set === undefined) return
  for (const listener of [...set]) listener(event)
}

// As on Android: a new height while the keyboard shows fires `keyboardDidShow` again.
const update = (): void => {
  frame = null
  const next = read()
  if (sameMetrics(next, current)) return
  current = next
  if (next === null) emit('keyboardDidHide', toEvent(hiddenMetrics()))
  else emit('keyboardDidShow', toEvent(next))
}

// The viewport can resize on each frame while the keyboard moves. One read per frame is enough.
const schedule = (): void => {
  if (frame === null) frame = requestAnimationFrame(update)
}

const startObserving = (): void => {
  if (observed !== null || !hasDOM()) return
  observed = {
    viewport: keyboardSources.visualViewport(),
    virtualKeyboard: keyboardSources.virtualKeyboard(),
  }
  current = read()
  observed.viewport?.addEventListener('resize', schedule)
  observed.virtualKeyboard?.addEventListener('geometrychange', schedule)
  window.addEventListener('resize', schedule)
}

const stopObserving = (): void => {
  if (observed === null) return
  for (const set of listeners.values()) if (set.size > 0) return
  observed.viewport?.removeEventListener('resize', schedule)
  observed.virtualKeyboard?.removeEventListener('geometrychange', schedule)
  window.removeEventListener('resize', schedule)
  observed = null
  if (frame !== null) cancelAnimationFrame(frame)
  frame = null
  current = null
}

const state = (): KeyboardMetrics | null => (observed === null ? read() : current)

/**
 * The keyboard of a phone or a tablet, as on Android: `keyboardDidShow` fires when the keyboard
 * shows and when its height changes, and `keyboardDidHide` fires when it hides. The `Will` and
 * `ChangeFrame` events never fire.
 */
export const Keyboard: {
  addListener: <K extends KeyboardEventName>(
    eventType: K,
    listener: (event: KeyboardEvent) => unknown,
    context?: unknown,
  ) => EventSubscription
  removeAllListeners: (eventType?: KeyboardEventName | null) => void
  dismiss: () => void
  isVisible: () => boolean
  metrics: () => KeyboardMetrics | null | undefined
  scheduleLayoutAnimation: (event: KeyboardEvent) => void
} = {
  addListener(eventType, listener) {
    let set = listeners.get(eventType)
    if (set === undefined) {
      set = new Set()
      listeners.set(eventType, set)
    }
    const entry: Listener = (event) => listener(event)
    set.add(entry)
    startObserving()
    return {
      remove: () => {
        set.delete(entry)
        stopObserving()
      },
    }
  },

  removeAllListeners(eventType) {
    if (eventType === undefined || eventType === null) listeners.clear()
    else listeners.delete(eventType)
    stopObserving()
  },

  dismiss() {
    if (!hasDOM()) return
    const active = document.activeElement
    if (isEditable(active)) active.blur()
  },

  isVisible() {
    return state() !== null
  },

  metrics() {
    return state() ?? undefined
  },

  // Native animates the next layout with the keyboard. The web has no layout animation, and its
  // keyboard events have no duration.
  scheduleLayoutAnimation() {},
}
