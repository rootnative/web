import type { SyntheticEvent } from 'react'

import { toGestureResponderEvent, toMouseEvent } from '../responderEvent'
import type { GestureResponderEvent } from '../types'
import type { PressabilityConfig, PressabilityEventHandlers, Rect, RectOrSize } from './types'

type TouchState =
  | 'NOT_RESPONDER'
  | 'RESPONDER_INACTIVE_PRESS_IN'
  | 'RESPONDER_INACTIVE_PRESS_OUT'
  | 'RESPONDER_ACTIVE_PRESS_IN'
  | 'RESPONDER_ACTIVE_PRESS_OUT'
  | 'RESPONDER_ACTIVE_LONG_PRESS_IN'
  | 'RESPONDER_ACTIVE_LONG_PRESS_OUT'

type TouchSignal =
  | 'DELAY'
  | 'RESPONDER_GRANT'
  | 'RESPONDER_RELEASE'
  | 'RESPONDER_TERMINATED'
  | 'ENTER_PRESS_RECT'
  | 'LEAVE_PRESS_RECT'
  | 'LONG_PRESS_DETECTED'

// The React Native press state machine, with the same names. A signal with no entry is
// invalid in that state. React Native throws on it; the web ignores it.
const transitions: Readonly<Record<TouchState, Partial<Record<TouchSignal, TouchState>>>> = {
  NOT_RESPONDER: {
    RESPONDER_GRANT: 'RESPONDER_INACTIVE_PRESS_IN',
  },
  RESPONDER_INACTIVE_PRESS_IN: {
    DELAY: 'RESPONDER_ACTIVE_PRESS_IN',
    RESPONDER_RELEASE: 'NOT_RESPONDER',
    RESPONDER_TERMINATED: 'NOT_RESPONDER',
    ENTER_PRESS_RECT: 'RESPONDER_INACTIVE_PRESS_IN',
    LEAVE_PRESS_RECT: 'RESPONDER_INACTIVE_PRESS_OUT',
  },
  RESPONDER_INACTIVE_PRESS_OUT: {
    DELAY: 'RESPONDER_ACTIVE_PRESS_OUT',
    RESPONDER_RELEASE: 'NOT_RESPONDER',
    RESPONDER_TERMINATED: 'NOT_RESPONDER',
    ENTER_PRESS_RECT: 'RESPONDER_INACTIVE_PRESS_IN',
    LEAVE_PRESS_RECT: 'RESPONDER_INACTIVE_PRESS_OUT',
  },
  RESPONDER_ACTIVE_PRESS_IN: {
    RESPONDER_RELEASE: 'NOT_RESPONDER',
    RESPONDER_TERMINATED: 'NOT_RESPONDER',
    ENTER_PRESS_RECT: 'RESPONDER_ACTIVE_PRESS_IN',
    LEAVE_PRESS_RECT: 'RESPONDER_ACTIVE_PRESS_OUT',
    LONG_PRESS_DETECTED: 'RESPONDER_ACTIVE_LONG_PRESS_IN',
  },
  RESPONDER_ACTIVE_PRESS_OUT: {
    RESPONDER_RELEASE: 'NOT_RESPONDER',
    RESPONDER_TERMINATED: 'NOT_RESPONDER',
    ENTER_PRESS_RECT: 'RESPONDER_ACTIVE_PRESS_IN',
    LEAVE_PRESS_RECT: 'RESPONDER_ACTIVE_PRESS_OUT',
  },
  RESPONDER_ACTIVE_LONG_PRESS_IN: {
    RESPONDER_RELEASE: 'NOT_RESPONDER',
    RESPONDER_TERMINATED: 'NOT_RESPONDER',
    ENTER_PRESS_RECT: 'RESPONDER_ACTIVE_LONG_PRESS_IN',
    LEAVE_PRESS_RECT: 'RESPONDER_ACTIVE_LONG_PRESS_OUT',
    LONG_PRESS_DETECTED: 'RESPONDER_ACTIVE_LONG_PRESS_IN',
  },
  RESPONDER_ACTIVE_LONG_PRESS_OUT: {
    RESPONDER_RELEASE: 'NOT_RESPONDER',
    RESPONDER_TERMINATED: 'NOT_RESPONDER',
    ENTER_PRESS_RECT: 'RESPONDER_ACTIVE_LONG_PRESS_IN',
    LEAVE_PRESS_RECT: 'RESPONDER_ACTIVE_LONG_PRESS_OUT',
  },
}

const isActive = (state: TouchState): boolean =>
  state === 'RESPONDER_ACTIVE_PRESS_IN' || state === 'RESPONDER_ACTIVE_LONG_PRESS_IN'

const isActivation = (state: TouchState): boolean =>
  state === 'RESPONDER_ACTIVE_PRESS_OUT' || state === 'RESPONDER_ACTIVE_PRESS_IN'

const isPressIn = (state: TouchState): boolean =>
  state === 'RESPONDER_INACTIVE_PRESS_IN' ||
  state === 'RESPONDER_ACTIVE_PRESS_IN' ||
  state === 'RESPONDER_ACTIVE_LONG_PRESS_IN'

const isTerminal = (signal: TouchSignal): boolean =>
  signal === 'RESPONDER_TERMINATED' || signal === 'RESPONDER_RELEASE'

const DEFAULT_LONG_PRESS_DELAY_MS = 500
const DEFAULT_MIN_PRESS_DURATION = 130
const DEFAULT_PRESS_RECT_OFFSETS = { bottom: 30, left: 20, right: 20, top: 20 }
let longPressDeactivationDistance = 10

const normalizeDelay = (delay: number | undefined, min = 0, fallback = 0): number =>
  Math.max(min, delay ?? fallback)

const normalizeRect = (rect: RectOrSize | undefined): Rect | undefined =>
  typeof rect === 'number' ? { bottom: rect, left: rect, right: rect, top: rect } : rect

// The innermost enabled pressable claims the native event, so its ancestors skip it, as
// with the native responder system. A disabled pressable does not claim.
const claimed = new WeakSet<Event>()

// Claims a native event for a boundary that isn't a pressable, so the pressables above it skip
// the event. A Modal claims the presses inside it, as its native host claims the responder.
export const claimPress = (event: Event): void => {
  claimed.add(event)
}

const isActivationKey = (key: string): boolean => key === 'Enter' || key === ' '

// The browser turns a key press on these elements into a click, which calls onPress.
const hasNativeActivation = (element: HTMLElement): boolean => {
  switch (element.tagName) {
    case 'BUTTON':
    case 'INPUT':
    case 'SELECT':
    case 'SUMMARY':
    case 'TEXTAREA':
      return true
    case 'A':
    case 'AREA':
      return element.hasAttribute('href')
    default:
      return element.isContentEditable
  }
}

const nativeControl =
  'a[href],area[href],audio[controls],button,input,select,summary,textarea,video[controls],' +
  '[contenteditable]:not([contenteditable="false"])'

// A native control inside the pressable owns its press, as a TextInput does on native.
const startsInNativeControl = (event: SyntheticEvent<HTMLElement>): boolean => {
  const { currentTarget, target } = event
  if (!(target instanceof Element)) return false
  const control = target.closest(nativeControl)
  return control !== null && control !== currentTarget && currentTarget.contains(control)
}

type Region = { bottom: number; left: number; right: number; top: number }

type Timer = ReturnType<typeof setTimeout>

const clear = (timer: Timer | null): null => {
  if (timer !== null) clearTimeout(timer)
  return null
}

export class Pressability {
  private config: PressabilityConfig
  private readonly handlers: PressabilityEventHandlers
  private state: TouchState = 'NOT_RESPONDER'
  private element: HTMLElement | null = null
  private region: Region | null = null
  private pointerId: number | null = null
  private key: string | null = null
  private activatePosition: { pageX: number; pageY: number } | null = null
  private activateTime: number | null = null
  private hovered = false
  // From a pointer press to its click, so the click does not press a second time.
  private pointerClickPending = false
  private cancelClick = false
  private hoverInTimer: Timer | null = null
  private hoverOutTimer: Timer | null = null
  private longPressTimer: Timer | null = null
  private pressDelayTimer: Timer | null = null
  private pressOutTimer: Timer | null = null

  constructor(config: PressabilityConfig) {
    this.config = config
    this.handlers = this.createEventHandlers()
  }

  configure(config: PressabilityConfig): void {
    this.config = config
  }

  // Clears pending timers. A late event after unmount calls no callback.
  reset(): void {
    this.hoverInTimer = clear(this.hoverInTimer)
    this.hoverOutTimer = clear(this.hoverOutTimer)
    this.longPressTimer = clear(this.longPressTimer)
    this.pressDelayTimer = clear(this.pressDelayTimer)
    this.pressOutTimer = clear(this.pressOutTimer)
    this.config = Object.freeze({})
  }

  getEventHandlers(): PressabilityEventHandlers {
    return this.handlers
  }

  static setLongPressDeactivationDistance(distance: number): void {
    longPressDeactivationDistance = distance
  }

  private createEventHandlers(): PressabilityEventHandlers {
    return {
      onPointerDown: (event) => {
        const native = event.nativeEvent
        if (event.button !== 0 || claimed.has(native) || this.config.disabled === true) return
        if (startsInNativeControl(event)) return
        claimed.add(native)
        if (this.pointerId !== null || this.key !== null) return

        const element = event.currentTarget
        this.pointerId = event.pointerId
        this.pointerClickPending = true
        // Keeps move and up events on this element when the pointer leaves it.
        try {
          element.setPointerCapture(event.pointerId)
        } catch {
          // A synthetic pointer has no capture.
        }
        this.grant(element, toGestureResponderEvent(event, element))
      },

      onPointerMove: (event) => {
        const element = this.element
        if (event.pointerId !== this.pointerId || element === null) return
        const pressEvent = toGestureResponderEvent(event, element)
        this.config.onPressMove?.(pressEvent)

        const region = this.region
        if (region === null) return
        const { pageX, pageY } = pressEvent.nativeEvent
        const start = this.activatePosition
        if (
          start !== null &&
          Math.hypot(start.pageX - pageX, start.pageY - pageY) > longPressDeactivationDistance
        ) {
          this.longPressTimer = clear(this.longPressTimer)
        }

        if (this.isWithinRegion(pageX, pageY, region)) {
          this.receiveSignal('ENTER_PRESS_RECT', pressEvent)
        } else {
          this.longPressTimer = clear(this.longPressTimer)
          this.receiveSignal('LEAVE_PRESS_RECT', pressEvent)
        }
      },

      onPointerUp: (event) => {
        const element = this.element
        if (event.pointerId !== this.pointerId || element === null) return
        this.pointerId = null
        this.receiveSignal('RESPONDER_RELEASE', toGestureResponderEvent(event, element))
      },

      onPointerCancel: (event) => {
        const element = this.element
        if (event.pointerId !== this.pointerId || element === null) return
        this.pointerId = null
        this.pointerClickPending = false
        this.receiveSignal('RESPONDER_TERMINATED', toGestureResponderEvent(event, element))
      },

      onClick: (event) => {
        const native = event.nativeEvent
        if (claimed.has(native) || startsInNativeControl(event)) return

        if (this.pointerClickPending && event.detail > 0) {
          this.pointerClickPending = false
          claimed.add(native)
          if (this.cancelClick) event.preventDefault()
          return
        }

        if (this.config.disabled === true) return
        claimed.add(native)
        // Keyboard on a native control, assistive technology, or element.click().
        this.config.onPress?.(toGestureResponderEvent(event, event.currentTarget))
      },

      onKeyDown: (event) => {
        if (!isActivationKey(event.key) || event.repeat || event.nativeEvent.isComposing) return
        const element = event.currentTarget
        if (event.target !== element || this.config.disabled === true) return
        if (hasNativeActivation(element)) return
        // Space scrolls the page.
        if (event.key === ' ') event.preventDefault()
        if (this.pointerId !== null || this.key !== null) return

        this.key = event.key
        this.grant(element, toGestureResponderEvent(event, element))
      },

      onKeyUp: (event) => {
        const element = this.element
        if (event.key !== this.key || element === null) return
        this.key = null
        this.receiveSignal('RESPONDER_RELEASE', toGestureResponderEvent(event, element))
      },

      onFocus: (event) => {
        this.config.onFocus?.(event)
      },

      onBlur: (event) => {
        const element = this.element
        if (this.key !== null && element !== null && event.target === event.currentTarget) {
          this.key = null
          this.receiveSignal('RESPONDER_TERMINATED', toGestureResponderEvent(event, element))
        }
        this.config.onBlur?.(event)
      },

      onPointerEnter: (event) => {
        if (event.pointerType === 'touch') return
        this.hovered = true
        this.hoverOutTimer = clear(this.hoverOutTimer)
        this.hover(event, this.config.onHoverIn, this.config.delayHoverIn, 'in')
      },

      onPointerLeave: (event) => {
        if (!this.hovered) return
        this.hovered = false
        this.hoverInTimer = clear(this.hoverInTimer)
        this.hover(event, this.config.onHoverOut, this.config.delayHoverOut, 'out')
      },

      // A touch long press opens the context menu. The press owns that gesture.
      onContextMenu: (event) => {
        if (this.pointerId !== null && this.config.onLongPress != null) event.preventDefault()
      },
    }
  }

  private hover(
    event: SyntheticEvent<HTMLElement>,
    callback: PressabilityConfig['onHoverIn'],
    delay: number | undefined,
    direction: 'in' | 'out',
  ): void {
    if (callback == null) return
    const hoverEvent = toMouseEvent(event)
    const wait = normalizeDelay(delay)
    if (wait === 0) {
      callback(hoverEvent)
      return
    }
    const timer = setTimeout(() => callback(hoverEvent), wait)
    if (direction === 'in') this.hoverInTimer = timer
    else this.hoverOutTimer = timer
  }

  private grant(element: HTMLElement, event: GestureResponderEvent): void {
    this.pressOutTimer = clear(this.pressOutTimer)
    this.element = element
    this.cancelClick = false
    this.state = 'NOT_RESPONDER'
    this.receiveSignal('RESPONDER_GRANT', event)

    const delayPressIn = normalizeDelay(this.config.delayPressIn)
    if (delayPressIn > 0) {
      this.pressDelayTimer = setTimeout(() => this.receiveSignal('DELAY', event), delayPressIn)
    } else {
      this.receiveSignal('DELAY', event)
    }

    const delayLongPress = normalizeDelay(
      this.config.delayLongPress,
      10,
      DEFAULT_LONG_PRESS_DELAY_MS - delayPressIn,
    )
    this.longPressTimer = setTimeout(() => {
      if (
        this.state === 'RESPONDER_ACTIVE_PRESS_IN' ||
        this.state === 'RESPONDER_ACTIVE_LONG_PRESS_IN'
      ) {
        this.receiveSignal('LONG_PRESS_DETECTED', event)
      }
    }, delayLongPress + delayPressIn)
  }

  private receiveSignal(signal: TouchSignal, event: GestureResponderEvent): void {
    const prevState = this.state
    const nextState = transitions[prevState][signal]
    if (nextState === undefined || nextState === prevState) return
    this.performTransitionSideEffects(prevState, nextState, signal, event)
    this.state = nextState
  }

  private performTransitionSideEffects(
    prevState: TouchState,
    nextState: TouchState,
    signal: TouchSignal,
    event: GestureResponderEvent,
  ): void {
    if (isTerminal(signal)) {
      this.activatePosition = null
      this.longPressTimer = clear(this.longPressTimer)
    }

    const isInitialTransition =
      prevState === 'NOT_RESPONDER' && nextState === 'RESPONDER_INACTIVE_PRESS_IN'
    const isActivationTransition = !isActivation(prevState) && isActivation(nextState)
    if (isInitialTransition || isActivationTransition) this.measureRegion()

    if (isPressIn(prevState) && signal === 'LONG_PRESS_DETECTED') {
      this.config.onLongPress?.(event)
    }

    const isPrevActive = isActive(prevState)
    const isNextActive = isActive(nextState)
    if (!isPrevActive && isNextActive) this.activate(event)
    else if (isPrevActive && !isNextActive) this.deactivate(event)

    if (isPressIn(prevState) && signal === 'RESPONDER_RELEASE') {
      // A press that ends before its delay activates and deactivates now.
      if (!isNextActive && !isPrevActive) {
        this.activate(event)
        this.deactivate(event)
      }
      const { onLongPress, onPress } = this.config
      const isPressCanceledByLongPress =
        onLongPress != null && prevState === 'RESPONDER_ACTIVE_LONG_PRESS_IN'
      if (isPressCanceledByLongPress) {
        this.cancelClick = true
      } else if (onPress != null) {
        onPress(event)
        if (event.isDefaultPrevented()) this.cancelClick = true
      }
    }

    this.pressDelayTimer = clear(this.pressDelayTimer)
  }

  private activate(event: GestureResponderEvent): void {
    const { pageX, pageY } = event.nativeEvent
    this.activatePosition = { pageX, pageY }
    this.activateTime = Date.now()
    this.config.onPressIn?.(event)
  }

  private deactivate(event: GestureResponderEvent): void {
    const { onPressOut } = this.config
    if (onPressOut != null) {
      const minPressDuration = normalizeDelay(
        this.config.minPressDuration,
        0,
        DEFAULT_MIN_PRESS_DURATION,
      )
      const pressDuration = Date.now() - (this.activateTime ?? 0)
      const delayPressOut = Math.max(
        minPressDuration - pressDuration,
        normalizeDelay(this.config.delayPressOut),
      )
      if (delayPressOut > 0) {
        this.pressOutTimer = setTimeout(() => onPressOut(event), delayPressOut)
      } else {
        onPressOut(event)
      }
    }
    this.activateTime = null
  }

  private measureRegion(): void {
    if (this.element === null) return
    const rect = this.element.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) return
    this.region = {
      bottom: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      right: rect.right + window.scrollX,
      top: rect.top + window.scrollY,
    }
  }

  private isWithinRegion(pageX: number, pageY: number, region: Region): boolean {
    const hitSlop = normalizeRect(this.config.hitSlop)
    const offset = normalizeRect(this.config.pressRectOffset)

    const bottom =
      region.bottom + (hitSlop?.bottom ?? 0) + (offset?.bottom ?? DEFAULT_PRESS_RECT_OFFSETS.bottom)
    const left =
      region.left - (hitSlop?.left ?? 0) - (offset?.left ?? DEFAULT_PRESS_RECT_OFFSETS.left)
    const right =
      region.right + (hitSlop?.right ?? 0) + (offset?.right ?? DEFAULT_PRESS_RECT_OFFSETS.right)
    const top = region.top - (hitSlop?.top ?? 0) - (offset?.top ?? DEFAULT_PRESS_RECT_OFFSETS.top)

    return pageX > left && pageX < right && pageY > top && pageY < bottom
  }
}
