import { afterEach, describe, expect, test } from 'vitest'

import { I18nManager, resetI18nManager } from './index'

afterEach(resetI18nManager)

describe('I18nManager', () => {
  test('follows the document direction', () => {
    expect(I18nManager.isRTL).toBe(false)
    document.documentElement.dir = 'rtl'
    expect(I18nManager.isRTL).toBe(true)
    expect(I18nManager.getConstants().isRTL).toBe(true)
  })

  test('allowRTL(false) ignores an RTL document', () => {
    document.documentElement.dir = 'rtl'
    I18nManager.allowRTL(false)
    expect(I18nManager.isRTL).toBe(false)
  })

  test('forceRTL sets the document direction at once', () => {
    I18nManager.forceRTL(true)
    expect(I18nManager.isRTL).toBe(true)
    expect(document.documentElement.dir).toBe('rtl')
    expect(getComputedStyle(document.body).direction).toBe('rtl')
    I18nManager.forceRTL(false)
    expect(I18nManager.isRTL).toBe(false)
    expect(document.documentElement.dir).toBe('')
  })

  test('swapLeftAndRightInRTL is remembered', () => {
    expect(I18nManager.doLeftAndRightSwapInRTL).toBe(true)
    I18nManager.swapLeftAndRightInRTL(false)
    expect(I18nManager.doLeftAndRightSwapInRTL).toBe(false)
    expect(I18nManager.getConstants().doLeftAndRightSwapInRTL).toBe(false)
  })

  test('localeIdentifier is the browser language', () => {
    expect(I18nManager.getConstants().localeIdentifier).toBe(navigator.language)
  })
})
