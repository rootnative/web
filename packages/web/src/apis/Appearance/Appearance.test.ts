import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { installFakeMatchMedia } from '../../test/matchMedia'
import { Appearance, resetAppearance } from './index'

const DARK = '(prefers-color-scheme: dark)'

describe('Appearance', () => {
  let media: ReturnType<typeof installFakeMatchMedia>

  beforeEach(() => {
    resetAppearance()
    media = installFakeMatchMedia()
  })
  afterEach(() => {
    resetAppearance()
    media.restore()
  })

  test('getColorScheme follows prefers-color-scheme', () => {
    expect(Appearance.getColorScheme()).toBe('light')
    media.get(DARK).matches = true
    expect(Appearance.getColorScheme()).toBe('dark')
  })

  test('change listener fires when the preference changes', () => {
    const listener = vi.fn()
    Appearance.addChangeListener(listener)

    media.get(DARK).set(true)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ colorScheme: 'dark' })
  })

  test('remove stops the listener', () => {
    const listener = vi.fn()
    Appearance.addChangeListener(listener).remove()
    media.get(DARK).set(true)
    expect(listener).not.toHaveBeenCalled()
  })

  test('setColorScheme overrides the preference and notifies', () => {
    const listener = vi.fn()
    Appearance.addChangeListener(listener)

    Appearance.setColorScheme('dark')

    expect(Appearance.getColorScheme()).toBe('dark')
    expect(listener).toHaveBeenCalledWith({ colorScheme: 'dark' })
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  test('setColorScheme with the current value does not notify', () => {
    const listener = vi.fn()
    Appearance.addChangeListener(listener)
    Appearance.setColorScheme('light')
    expect(listener).not.toHaveBeenCalled()
  })

  test('an override hides preference changes', () => {
    const listener = vi.fn()
    Appearance.setColorScheme('light')
    Appearance.addChangeListener(listener)

    media.get(DARK).set(true)

    expect(listener).not.toHaveBeenCalled()
    expect(Appearance.getColorScheme()).toBe('light')
  })

  test.each(['unspecified', null, undefined] as const)(
    'setColorScheme(%s) returns to the preference',
    (value) => {
      const listener = vi.fn()
      media.get(DARK).matches = true
      Appearance.setColorScheme('light')
      Appearance.addChangeListener(listener)

      Appearance.setColorScheme(value)

      expect(Appearance.getColorScheme()).toBe('dark')
      expect(listener).toHaveBeenCalledWith({ colorScheme: 'dark' })
      expect(document.documentElement.style.colorScheme).toBe('')
    },
  )
})
