import { afterEach, describe, expect, test, vi } from 'vitest'

import type { ViewToken } from './types'
import { computeViewableIndices, ViewabilityTracker, type CellMetrics } from './viewability'

// Ten items of 100 px, one after the other.
const uniform = (index: number): CellMetrics | undefined =>
  index < 10 ? { offset: index * 100, length: 100 } : undefined

// One 1000 px item: it fills any viewport.
const big = (index: number): CellMetrics | undefined =>
  index === 0 ? { offset: 0, length: 1000 } : undefined

// The uniform list with item 2 not measured.
const withoutTwo = (index: number): CellMetrics | undefined =>
  index === 2 ? undefined : uniform(index)

const token = (index: number, isViewable: boolean): ViewToken<string> => ({
  item: `item-${index}`,
  key: String(index),
  index,
  isViewable,
})

afterEach(() => {
  vi.useRealTimers()
})

describe('computeViewableIndices', () => {
  test('the default config counts every item with a visible pixel', () => {
    expect(
      computeViewableIndices(10, uniform, 50, 300, { viewAreaCoveragePercentThreshold: 0 }),
    ).toEqual([0, 1, 2, 3])
  })

  test('itemVisiblePercentThreshold measures the visible part of the item', () => {
    // Item 0 shows 50 px of 100, item 3 shows 50 px of 100.
    expect(
      computeViewableIndices(10, uniform, 50, 300, { itemVisiblePercentThreshold: 50 }),
    ).toEqual([0, 1, 2, 3])
    expect(
      computeViewableIndices(10, uniform, 50, 300, { itemVisiblePercentThreshold: 51 }),
    ).toEqual([1, 2])
  })

  test('viewAreaCoveragePercentThreshold measures the share of the viewport', () => {
    // Items 1 and 2 cover 100 of 300 px each; items 0 and 3 cover 50.
    expect(
      computeViewableIndices(10, uniform, 50, 300, { viewAreaCoveragePercentThreshold: 20 }),
    ).toEqual([1, 2])
  })

  test('an item that fills the viewport covers the whole view area', () => {
    expect(
      computeViewableIndices(1, big, 200, 300, { viewAreaCoveragePercentThreshold: 100 }),
    ).toEqual([0])
    // Only 30% of the item itself is visible.
    expect(computeViewableIndices(1, big, 200, 300, { itemVisiblePercentThreshold: 31 })).toEqual(
      [],
    )
  })

  test('stops after the visible run and skips unmeasured items', () => {
    expect(
      computeViewableIndices(10, withoutTwo, 100, 300, { viewAreaCoveragePercentThreshold: 0 }),
    ).toEqual([1, 3])
  })

  test('needs exactly one threshold', () => {
    expect(() => computeViewableIndices(10, uniform, 0, 300, {})).toThrow(/exactly one/)
    expect(() =>
      computeViewableIndices(10, uniform, 0, 300, {
        itemVisiblePercentThreshold: 10,
        viewAreaCoveragePercentThreshold: 10,
      }),
    ).toThrow(/exactly one/)
  })
})

describe('ViewabilityTracker', () => {
  test('reports the items that entered and left', () => {
    const tracker = new ViewabilityTracker<string>()
    const onChange = vi.fn()
    tracker.onUpdate(10, uniform, 0, 300, token, onChange)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]?.[0]).toEqual({
      viewableItems: [token(0, true), token(1, true), token(2, true)],
      changed: [token(0, true), token(1, true), token(2, true)],
    })

    tracker.onUpdate(10, uniform, 100, 300, token, onChange)
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange.mock.calls[1]?.[0]).toEqual({
      viewableItems: [token(1, true), token(2, true), token(3, true)],
      changed: [token(3, true), token(0, false)],
    })
  })

  test('says nothing when the set did not change', () => {
    const tracker = new ViewabilityTracker<string>()
    const onChange = vi.fn()
    tracker.onUpdate(10, uniform, 0, 300, token, onChange)
    // Item 3 starts at 300: still out of a 300 px viewport.
    tracker.onUpdate(10, uniform, 0, 300, token, onChange)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test('says nothing for an empty or unmeasured list', () => {
    const tracker = new ViewabilityTracker<string>()
    const onChange = vi.fn()
    tracker.onUpdate(0, uniform, 0, 300, token, onChange)
    tracker.onUpdate(10, () => undefined, 0, 300, token, onChange)
    expect(onChange).not.toHaveBeenCalled()
  })

  test('minimumViewTime waits, and a change in between cancels the report', () => {
    vi.useFakeTimers()
    const tracker = new ViewabilityTracker<string>({
      viewAreaCoveragePercentThreshold: 0,
      minimumViewTime: 500,
    })
    const onChange = vi.fn()
    tracker.onUpdate(10, uniform, 0, 300, token, onChange)
    vi.advanceTimersByTime(200)
    expect(onChange).not.toHaveBeenCalled()

    tracker.onUpdate(10, uniform, 400, 300, token, onChange)
    vi.advanceTimersByTime(400)
    expect(onChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(onChange).toHaveBeenCalledTimes(1)
    const info = onChange.mock.calls[0]?.[0] as { viewableItems: ViewToken[] }
    expect(info.viewableItems.map((t) => t.index)).toEqual([4, 5, 6])
  })

  test('dispose cancels a pending report', () => {
    vi.useFakeTimers()
    const tracker = new ViewabilityTracker<string>({
      viewAreaCoveragePercentThreshold: 0,
      minimumViewTime: 500,
    })
    const onChange = vi.fn()
    tracker.onUpdate(10, uniform, 0, 300, token, onChange)
    tracker.dispose()
    vi.advanceTimersByTime(1000)
    expect(onChange).not.toHaveBeenCalled()
  })

  test('waitForInteraction holds the report until recordInteraction', () => {
    const tracker = new ViewabilityTracker<string>({
      viewAreaCoveragePercentThreshold: 0,
      waitForInteraction: true,
    })
    const onChange = vi.fn()
    tracker.onUpdate(10, uniform, 0, 300, token, onChange)
    expect(onChange).not.toHaveBeenCalled()

    tracker.recordInteraction()
    tracker.onUpdate(10, uniform, 0, 300, token, onChange)
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
