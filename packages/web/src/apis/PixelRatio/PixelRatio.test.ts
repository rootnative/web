import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { resetDimensions } from '../Dimensions'
import { PixelRatio } from './index'

const setRatio = (value: number): void => {
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value })
}

describe('PixelRatio', () => {
  const ratio = window.devicePixelRatio

  beforeEach(resetDimensions)
  afterEach(() => {
    setRatio(ratio)
    document.documentElement.style.fontSize = ''
    resetDimensions()
  })

  test('get is the device pixel ratio', () => {
    setRatio(2)
    expect(PixelRatio.get()).toBe(2)
  })

  test('getFontScale follows the root font size', () => {
    document.documentElement.style.fontSize = '24px'
    expect(PixelRatio.getFontScale()).toBe(1.5)
  })

  test('converts layout sizes to pixels', () => {
    setRatio(3)
    expect(PixelRatio.getPixelSizeForLayoutSize(10)).toBe(30)
    expect(PixelRatio.getPixelSizeForLayoutSize(10.4)).toBe(31)
  })

  test('rounds to the nearest device pixel', () => {
    setRatio(2)
    expect(PixelRatio.roundToNearestPixel(8.4)).toBe(8.5)
    expect(PixelRatio.roundToNearestPixel(8.2)).toBe(8)
  })

  test('startDetecting does nothing', () => {
    expect(() => PixelRatio.startDetecting()).not.toThrow()
  })
})
