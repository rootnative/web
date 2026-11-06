import { describe, expect, test } from 'vitest'

import { reactNativeVersion } from '../../reactNativeVersion'
import { Platform } from './index'

describe('Platform', () => {
  test('OS is web', () => {
    expect(Platform.OS).toBe('web')
  })

  test('Version is the user agent in a browser', () => {
    expect(Platform.Version).toBe(navigator.userAgent)
  })

  test('constants carry the matched react-native version', () => {
    expect(Platform.constants.reactNativeVersion).toEqual(reactNativeVersion)
  })

  test('isTV is false', () => {
    expect(Platform.isTV).toBe(false)
  })

  test('isTesting is true under vitest', () => {
    expect(Platform.isTesting).toBe(true)
  })

  test('isDisableAnimations follows prefers-reduced-motion', () => {
    expect(Platform.isDisableAnimations).toBe(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
  })

  describe('select', () => {
    test('prefers the web key', () => {
      expect(Platform.select({ web: 1, native: 2, default: 3 })).toBe(1)
    })

    test('falls back to default', () => {
      expect(Platform.select({ ios: 1, android: 2, default: 3 })).toBe(3)
    })

    test('ignores native', () => {
      expect(Platform.select({ native: 2, default: 3 })).toBe(3)
    })

    test('returns undefined when nothing matches', () => {
      expect(Platform.select({ ios: 1 })).toBeUndefined()
    })

    test('accepts a web value of undefined', () => {
      expect(Platform.select({ web: undefined, default: 3 })).toBeUndefined()
    })
  })
})
