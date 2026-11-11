import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { AppState, resetAppState } from './index'

// Headless engines don't agree on the visibility of the test page, so each test sets it.
const setVisibility = (state: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}

const changeVisibility = (state: DocumentVisibilityState): void => {
  setVisibility(state)
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('AppState', () => {
  beforeEach(() => {
    resetAppState()
    setVisibility('visible')
  })
  afterEach(() => {
    resetAppState()
    Reflect.deleteProperty(document, 'visibilityState')
  })

  test('currentState follows the visibility of the page', () => {
    expect(AppState.currentState).toBe('active')
    setVisibility('hidden')
    expect(AppState.currentState).toBe('background')
  })

  test('isAvailable is true', () => {
    expect(AppState.isAvailable).toBe(true)
  })

  test('change fires with the new state when the page is hidden and shown', () => {
    const handler = vi.fn()
    AppState.addEventListener('change', handler)

    changeVisibility('hidden')
    changeVisibility('visible')

    expect(handler.mock.calls).toEqual([['background'], ['active']])
  })

  test('two held visibility events report the trip to the background, as iOS sends them', () => {
    const handler = vi.fn()
    AppState.addEventListener('change', handler)

    // The page is visible again before the "hidden" event runs.
    changeVisibility('visible')
    changeVisibility('visible')

    expect(handler.mock.calls).toEqual([['background'], ['active']])
  })

  test('a repeat of the same window focus event fires once', () => {
    const onFocus = vi.fn()
    AppState.addEventListener('focus', onFocus)

    window.dispatchEvent(new FocusEvent('focus'))
    window.dispatchEvent(new FocusEvent('focus'))
    expect(onFocus).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new FocusEvent('blur'))
    window.dispatchEvent(new FocusEvent('focus'))
    expect(onFocus).toHaveBeenCalledTimes(2)
  })

  test('pagehide is the background until pageshow, also while the page is visible', () => {
    const handler = vi.fn()
    AppState.addEventListener('change', handler)

    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
    expect(AppState.currentState).toBe('background')

    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    expect(AppState.currentState).toBe('active')
    expect(handler.mock.calls).toEqual([['background'], ['active']])
  })

  test('a hidden page that unloads fires change once', () => {
    const handler = vi.fn()
    AppState.addEventListener('change', handler)

    changeVisibility('hidden')
    window.dispatchEvent(new PageTransitionEvent('pagehide'))

    expect(handler.mock.calls).toEqual([['background']])
  })

  test('blur and focus fire when the window loses and gets the focus', () => {
    const onBlur = vi.fn()
    const onFocus = vi.fn()
    const onChange = vi.fn()
    AppState.addEventListener('blur', onBlur)
    AppState.addEventListener('focus', onFocus)
    AppState.addEventListener('change', onChange)

    window.dispatchEvent(new FocusEvent('blur'))
    expect(onBlur).toHaveBeenCalledTimes(1)
    expect(onBlur).toHaveBeenCalledWith()
    expect(onFocus).not.toHaveBeenCalled()

    window.dispatchEvent(new FocusEvent('focus'))
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
    expect(AppState.currentState).toBe('active')
  })

  test('the focus events of an element are not window focus changes', () => {
    const onBlur = vi.fn()
    AppState.addEventListener('blur', onBlur)
    const element = document.createElement('div')
    document.body.append(element)

    element.dispatchEvent(new FocusEvent('blur', { bubbles: true }))

    expect(onBlur).not.toHaveBeenCalled()
    element.remove()
  })

  test('remove stops the handler', () => {
    const handler = vi.fn()
    AppState.addEventListener('change', handler).remove()
    changeVisibility('hidden')
    expect(handler).not.toHaveBeenCalled()
  })

  test('memoryWarning registers and returns a subscription', () => {
    const subscription = AppState.addEventListener('memoryWarning', vi.fn())
    expect(() => subscription.remove()).not.toThrow()
  })

  test('an unknown event throws, as on native', () => {
    expect(() => AppState.addEventListener('nope' as 'change', vi.fn())).toThrowError(
      'Trying to subscribe to unknown event: nope',
    )
  })
})
