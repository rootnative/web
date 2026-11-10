import type { PressabilityEventHandlers } from './types'

// DOM handlers that both the app and the press responder can set. Both run, the app first.
// Focus and blur aren't in the list: they reach the app through the onFocus and onBlur of the
// press config.
const sharedHandlers = [
  'onClick',
  'onContextMenu',
  'onKeyDown',
  'onKeyUp',
  'onPointerCancel',
  'onPointerDown',
  'onPointerEnter',
  'onPointerLeave',
  'onPointerMove',
  'onPointerUp',
] as const

type Handler = (event: unknown) => void

export const mergeHandlers = (
  app: object,
  own: PressabilityEventHandlers,
): PressabilityEventHandlers => {
  const merged: Record<string, unknown> = { ...own }
  for (const key of sharedHandlers) {
    const value = (app as Record<string, unknown>)[key]
    if (typeof value !== 'function') continue
    const appHandler = value as Handler
    const ownHandler = own[key] as Handler
    merged[key] = (event: unknown) => {
      appHandler(event)
      ownHandler(event)
    }
  }
  return merged as PressabilityEventHandlers
}
