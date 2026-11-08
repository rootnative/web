import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { installFakeMatchMedia } from '../../test/matchMedia'
import { AccessibilityInfo, resetAccessibilityInfo } from './index'

const REDUCE_MOTION = '(prefers-reduced-motion: reduce)'

describe('AccessibilityInfo', () => {
  let media: ReturnType<typeof installFakeMatchMedia>

  beforeEach(() => {
    media = installFakeMatchMedia()
  })
  afterEach(() => {
    media.restore()
    resetAccessibilityInfo()
  })

  test('what the browser cannot know is false', async () => {
    await expect(AccessibilityInfo.isScreenReaderEnabled()).resolves.toBe(false)
    await expect(AccessibilityInfo.isBoldTextEnabled()).resolves.toBe(false)
    await expect(AccessibilityInfo.isGrayscaleEnabled()).resolves.toBe(false)
    await expect(AccessibilityInfo.isAccessibilityServiceEnabled()).resolves.toBe(false)
  })

  test('media preferences are read live', async () => {
    await expect(AccessibilityInfo.isReduceMotionEnabled()).resolves.toBe(false)
    media.get(REDUCE_MOTION).matches = true
    await expect(AccessibilityInfo.isReduceMotionEnabled()).resolves.toBe(true)
    await expect(AccessibilityInfo.prefersCrossFadeTransitions()).resolves.toBe(true)

    media.get('(prefers-contrast: more)').matches = true
    await expect(AccessibilityInfo.isHighTextContrastEnabled()).resolves.toBe(true)
    await expect(AccessibilityInfo.isDarkerSystemColorsEnabled()).resolves.toBe(true)
  })

  test('getRecommendedTimeoutMillis returns the given timeout', async () => {
    await expect(AccessibilityInfo.getRecommendedTimeoutMillis(1500)).resolves.toBe(1500)
  })

  test('reduceMotionChanged follows the media query until removed', () => {
    const handler = vi.fn()
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', handler)
    media.get(REDUCE_MOTION).set(true)
    expect(handler).toHaveBeenCalledWith(true)
    subscription.remove()
    media.get(REDUCE_MOTION).set(false)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('screenReaderChanged never fires, and still removes', () => {
    const handler = vi.fn()
    expect(() =>
      AccessibilityInfo.addEventListener('screenReaderChanged', handler).remove(),
    ).not.toThrow()
  })

  test('announceForAccessibility writes to a polite live region', async () => {
    const finished = vi.fn()
    AccessibilityInfo.addEventListener('announcementFinished', finished)

    AccessibilityInfo.announceForAccessibility('Saved')
    const region = document.querySelector('[data-rn-announcer]') as HTMLElement
    expect(region.getAttribute('aria-live')).toBe('polite')

    await vi.waitFor(() => expect(region.textContent).toBe('Saved'))
    expect(finished).toHaveBeenCalledWith({ announcement: 'Saved', success: true })
    expect(getComputedStyle(region).position).toBe('absolute')
  })

  test('queue: false is assertive', async () => {
    AccessibilityInfo.announceForAccessibilityWithOptions('Now', { queue: false })
    const region = document.querySelector('[data-rn-announcer]') as HTMLElement
    expect(region.getAttribute('aria-live')).toBe('assertive')
    await vi.waitFor(() => expect(region.textContent).toBe('Now'))
  })

  test('setAccessibilityFocus and sendAccessibilityEvent focus an element', () => {
    const button = document.createElement('button')
    document.body.appendChild(button)
    try {
      AccessibilityInfo.setAccessibilityFocus(button)
      expect(document.activeElement).toBe(button)
      button.blur()
      AccessibilityInfo.sendAccessibilityEvent(button, 'focus')
      expect(document.activeElement).toBe(button)
      expect(() => AccessibilityInfo.setAccessibilityFocus(42)).not.toThrow()
    } finally {
      button.remove()
    }
  })
})
