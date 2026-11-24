import { isEditable } from '../utils/editable'
import { hasDOM } from '../utils/env'
import { isPressClaimed } from './press/Pressability'

export type KeyboardShouldPersistTaps = boolean | 'always' | 'never' | 'handled' | undefined

// The `keyboardShouldPersistTaps` of each mounted ScrollView, by its scroll element.
const persistTapsOf = new WeakMap<Element, KeyboardShouldPersistTaps>()

export const setPersistTaps = (element: Element, value: KeyboardShouldPersistTaps): void => {
  persistTapsOf.set(element, value)
}

export const clearPersistTaps = (element: Element): void => {
  persistTapsOf.delete(element)
}

// `true` and `false` are React Native's old values for 'always' and 'never'.
const modeOf = (value: KeyboardShouldPersistTaps): 'always' | 'never' | 'handled' => {
  if (value === true || value === 'always') return 'always'
  return value === 'handled' ? 'handled' : 'never'
}

let lastPointerDown: PointerEvent | null = null
let listening = false

// On native, a tap outside a text field keeps the keyboard, except where a ScrollView takes the
// tap to dismiss it (`keyboardShouldPersistTaps`). React Native asks the ScrollViews from the
// outside in: one with 'never' dismisses, and one with 'handled' dismisses when no pressable or
// responder inside takes the tap. A browser moves the focus on the `mousedown` of each tap, so the
// keyboard hides. Only a touch or a pen tap counts: a mouse click keeps the browser's rule.
const keepsFocus = (event: MouseEvent): boolean => {
  const down = lastPointerDown
  if (down === null || (down.pointerType !== 'touch' && down.pointerType !== 'pen')) return false
  const active = document.activeElement
  const { target } = event
  if (!isEditable(active) || !(target instanceof Element)) return false
  if (active.contains(target) || isEditable(target) || target.closest('select') !== null) {
    return false
  }
  let dismissesUnhandled = false
  for (let node: Element | null = target; node !== null; node = node.parentElement) {
    if (!persistTapsOf.has(node)) continue
    const mode = modeOf(persistTapsOf.get(node))
    if (mode === 'never') return false
    if (mode === 'handled') dismissesUnhandled = true
  }
  return !dismissesUnhandled || isPressClaimed(down)
}

const rememberPointerDown = (event: PointerEvent): void => {
  lastPointerDown = event
}

const keepFocusOnTap = (event: MouseEvent): void => {
  if (keepsFocus(event)) event.preventDefault()
}

// Called when a text field takes the focus, so a page with no text field pays nothing.
export const listenForTapsOutsideField = (): void => {
  if (listening || !hasDOM()) return
  listening = true
  document.addEventListener('pointerdown', rememberPointerDown, true)
  document.addEventListener('mousedown', keepFocusOnTap, true)
}
