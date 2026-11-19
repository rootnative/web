import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { LayoutAnimation } from './index'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('configureNext', () => {
  test('calls onAnimationDidEnd once, one frame and 1 ms after the duration', () => {
    const onEnd = vi.fn()
    const onFail = vi.fn()
    LayoutAnimation.configureNext({ duration: 300 }, onEnd, onFail)

    vi.advanceTimersByTime(316)
    expect(onEnd).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(onEnd).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(1000)
    expect(onEnd).toHaveBeenCalledOnce()
    expect(onFail).not.toHaveBeenCalled()
  })

  test('takes a duration of 0, and no callback', () => {
    const onEnd = vi.fn()
    LayoutAnimation.configureNext({ duration: 0 }, onEnd)
    vi.advanceTimersByTime(17)
    expect(onEnd).toHaveBeenCalledOnce()

    expect(() => LayoutAnimation.configureNext({ duration: 100 })).not.toThrow()
    vi.advanceTimersByTime(200)
  })

  test('the shortcuts use the duration of their preset', () => {
    const ends = { easeInEaseOut: vi.fn(), linear: vi.fn(), spring: vi.fn() }
    LayoutAnimation.easeInEaseOut(ends.easeInEaseOut)
    LayoutAnimation.linear(ends.linear)
    LayoutAnimation.spring(ends.spring)

    vi.advanceTimersByTime(317)
    expect(ends.easeInEaseOut).toHaveBeenCalledOnce()
    expect(ends.linear).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(ends.linear).toHaveBeenCalledOnce()
    expect(ends.spring).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(ends.spring).toHaveBeenCalledOnce()
  })
})

describe('the configs', () => {
  test('create gives the type to each kind and the property to create and delete', () => {
    expect(LayoutAnimation.create(200, 'easeIn', 'scaleXY')).toEqual({
      duration: 200,
      create: { type: 'easeIn', property: 'scaleXY' },
      update: { type: 'easeIn' },
      delete: { type: 'easeIn', property: 'scaleXY' },
    })
  })

  test("the presets are React Native's", () => {
    expect(LayoutAnimation.Presets.easeInEaseOut).toEqual(
      LayoutAnimation.create(300, 'easeInEaseOut', 'opacity'),
    )
    expect(LayoutAnimation.Presets.linear).toEqual(LayoutAnimation.create(500, 'linear', 'opacity'))
    expect(LayoutAnimation.Presets.spring).toEqual({
      duration: 700,
      create: { type: 'linear', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.4 },
      delete: { type: 'linear', property: 'opacity' },
    })
  })

  test('Types and Properties name each value and are frozen', () => {
    expect(Object.values(LayoutAnimation.Types)).toEqual([
      'spring',
      'linear',
      'easeInEaseOut',
      'easeIn',
      'easeOut',
      'keyboard',
    ])
    expect(Object.values(LayoutAnimation.Properties)).toEqual([
      'opacity',
      'scaleX',
      'scaleY',
      'scaleXY',
    ])
    expect(Object.isFrozen(LayoutAnimation.Types)).toBe(true)
    expect(Object.isFrozen(LayoutAnimation.Properties)).toBe(true)
  })

  test('checkConfig logs that React Native turned it off, and setEnabled does nothing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    LayoutAnimation.checkConfig({ duration: 1 })
    expect(error).toHaveBeenCalledExactlyOnceWith(
      'LayoutAnimation.checkConfig(...) has been disabled.',
    )
    expect(LayoutAnimation.setEnabled(false)).toBeUndefined()
  })
})
