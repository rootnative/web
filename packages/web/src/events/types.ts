import type { BaseSyntheticEvent, FocusEvent as ReactFocusEvent } from 'react'

// On the web, `nativeEvent` is the DOM event. It keeps its DOM fields, for example
// `pointerType`, `button`, and `shiftKey`, next to the React Native fields.
export type NativeSyntheticEvent<T> = BaseSyntheticEvent<T, HTMLElement, EventTarget>

export type NativeTouchEvent = Readonly<{
  changedTouches: ReadonlyArray<NativeTouchEvent>
  force?: number | undefined
  identifier: number
  locationX: number
  locationY: number
  pageX: number
  pageY: number
  target: EventTarget | null
  timestamp: number
  touches: ReadonlyArray<NativeTouchEvent>
}>

export type GestureResponderEvent = NativeSyntheticEvent<NativeTouchEvent>

export type MouseEvent = NativeSyntheticEvent<
  Readonly<{
    clientX: number
    clientY: number
    pageX: number
    pageY: number
    timestamp: number
  }>
>

export type FocusEvent = ReactFocusEvent<HTMLElement>

export type BlurEvent = ReactFocusEvent<HTMLElement>
