import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { stubNavigator } from '../../test/navigator'
import { Vibration } from './index'

describe('Vibration', () => {
  let vibrate: ReturnType<typeof vi.fn>
  let restore: () => void

  beforeEach(() => {
    vi.useFakeTimers()
    vibrate = vi.fn(() => true)
    restore = stubNavigator('vibrate', vibrate)
  })
  afterEach(() => {
    Vibration.cancel()
    restore()
    vi.useRealTimers()
  })

  test('vibrates for 400 ms by default', () => {
    Vibration.vibrate()
    expect(vibrate).toHaveBeenCalledWith([400])
  })

  test('a number is one vibration of that length, and it never repeats', () => {
    Vibration.vibrate(250, true)
    vi.advanceTimersByTime(1000)
    expect(vibrate.mock.calls).toEqual([[[250]]])
  })

  test('an array starts with a wait, as on Android, so the web pattern starts with 0', () => {
    Vibration.vibrate([100, 200, 300])
    expect(vibrate).toHaveBeenCalledWith([0, 100, 200, 300])
  })

  test('repeat runs the pattern again after its total length until cancel', () => {
    Vibration.vibrate([100, 200, 300], true)
    vi.advanceTimersByTime(600)
    vi.advanceTimersByTime(600)
    expect(vibrate).toHaveBeenCalledTimes(3)

    Vibration.cancel()
    expect(vibrate).toHaveBeenLastCalledWith(0)
    vi.advanceTimersByTime(2000)
    expect(vibrate).toHaveBeenCalledTimes(4)
  })

  test('a new vibrate stops the repeat of the last one', () => {
    Vibration.vibrate([100, 100], true)
    Vibration.vibrate(50)
    vi.advanceTimersByTime(1000)
    expect(vibrate.mock.calls).toEqual([[[0, 100, 100]], [[50]]])
  })

  test('a pattern of zero length does not repeat', () => {
    Vibration.vibrate([0, 0], true)
    expect(vi.getTimerCount()).toBe(0)
  })

  test("a pattern that isn't a number or an array throws React Native's error", () => {
    expect(() => Vibration.vibrate('x' as unknown as number)).toThrowError(
      'Vibration pattern should be a number or array',
    )
  })

  test('does nothing in a browser with no vibration', () => {
    restore()
    restore = stubNavigator('vibrate', undefined)
    expect(() => {
      Vibration.vibrate([100, 100], true)
      Vibration.cancel()
    }).not.toThrow()
    expect(vi.getTimerCount()).toBe(0)
  })
})
