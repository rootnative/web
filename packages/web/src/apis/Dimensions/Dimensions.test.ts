import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { Dimensions, resetDimensions } from './index'

const setInnerSize = (width: number, height: number): void => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

describe('Dimensions', () => {
  const innerWidth = window.innerWidth
  const innerHeight = window.innerHeight

  beforeEach(resetDimensions)
  afterEach(() => {
    setInnerSize(innerWidth, innerHeight)
    document.documentElement.style.fontSize = ''
    resetDimensions()
  })

  test('window is the layout viewport', () => {
    const size = Dimensions.get('window')
    expect(size.width).toBe(window.innerWidth)
    expect(size.height).toBe(window.innerHeight)
    expect(size.scale).toBe(window.devicePixelRatio)
    expect(size.fontScale).toBe(1)
  })

  test('screen is the display', () => {
    const size = Dimensions.get('screen')
    expect(size.width).toBe(window.screen.width)
    expect(size.height).toBe(window.screen.height)
  })

  test('fontScale follows the root font size', () => {
    document.documentElement.style.fontSize = '20px'
    expect(Dimensions.get('window').fontScale).toBe(1.25)
  })

  test('change fires on resize with both sizes', () => {
    const handler = vi.fn()
    Dimensions.addEventListener('change', handler)

    setInnerSize(320, 480)
    window.dispatchEvent(new Event('resize'))

    expect(handler).toHaveBeenCalledTimes(1)
    const value = handler.mock.calls[0]?.[0]
    expect(value.window.width).toBe(320)
    expect(value.window.height).toBe(480)
    expect(value.screen.width).toBe(window.screen.width)
    expect(Dimensions.get('window').width).toBe(320)
  })

  test('change does not fire when nothing changed', () => {
    const handler = vi.fn()
    Dimensions.addEventListener('change', handler)
    window.dispatchEvent(new Event('resize'))
    expect(handler).not.toHaveBeenCalled()
  })

  test('remove stops the handler', () => {
    const handler = vi.fn()
    Dimensions.addEventListener('change', handler).remove()
    setInnerSize(300, 300)
    window.dispatchEvent(new Event('resize'))
    expect(handler).not.toHaveBeenCalled()
  })

  test('rejects an unknown event type', () => {
    expect(() => Dimensions.addEventListener('other' as 'change', () => {})).toThrow()
  })
})
