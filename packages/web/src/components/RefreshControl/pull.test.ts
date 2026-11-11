import { describe, expect, test } from 'vitest'

import { PULL_TARGET, pullOffset, releasesRefresh } from './pull'

describe('pullOffset', () => {
  test('follows the finger at half the speed up to the target', () => {
    expect(pullOffset(0)).toBe(0)
    expect(pullOffset(100)).toBe(50)
    expect(pullOffset(PULL_TARGET * 2)).toBe(PULL_TARGET)
  })

  test('is 0 for a finger above the start', () => {
    expect(pullOffset(-40)).toBe(0)
  })

  test('slows down past the target and stays under twice the target', () => {
    const past = [200, 400, 800, 10_000].map(pullOffset)
    for (const [index, offset] of past.entries()) {
      expect(offset).toBeGreaterThan(PULL_TARGET)
      expect(offset).toBeLessThan(PULL_TARGET * 2)
      if (index > 0) expect(offset).toBeGreaterThan(past[index - 1] ?? 0)
    }
    // 72 px of finger past the target: less than the 36 px of half the speed.
    expect(pullOffset(200) - pullOffset(128)).toBeLessThan(36)
  })
})

describe('releasesRefresh', () => {
  test('is true after twice the target of finger distance', () => {
    expect(releasesRefresh(PULL_TARGET * 2)).toBe(false)
    expect(releasesRefresh(PULL_TARGET * 2 + 1)).toBe(true)
  })
})
