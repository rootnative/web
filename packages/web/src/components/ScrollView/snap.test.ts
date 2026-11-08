import { describe, expect, test } from 'vitest'

import { snapTarget, type SnapConfig } from './snap'

const interval = (overrides: Partial<SnapConfig> = {}): SnapConfig => ({
  offsets: undefined,
  interval: 100,
  alignment: 'start',
  snapToStart: true,
  snapToEnd: true,
  ...overrides,
})

const offsets = (list: number[], overrides: Partial<SnapConfig> = {}): SnapConfig => ({
  offsets: list,
  interval: undefined,
  alignment: 'start',
  snapToStart: true,
  snapToEnd: true,
  ...overrides,
})

describe('snapTarget', () => {
  test('interval snaps to the nearest multiple', () => {
    expect(snapTarget(130, 300, 1000, interval())).toBe(100)
    expect(snapTarget(170, 300, 1000, interval())).toBe(200)
  })

  test('returns undefined at rest on a snap point', () => {
    expect(snapTarget(200, 300, 1000, interval())).toBeUndefined()
    expect(snapTarget(200.2, 300, 1000, interval())).toBeUndefined()
  })

  test('clamps to the content', () => {
    expect(snapTarget(-20, 300, 1000, interval())).toBe(0)
    expect(snapTarget(690, 300, 1000, interval())).toBe(700)
    expect(snapTarget(740, 300, 1000, interval())).toBe(700)
  })

  test('center and end alignment shift the item in the viewport', () => {
    // Item 2 starts at 200. Centered in 300: 200 - 100 = 100.
    expect(snapTarget(110, 300, 1000, interval({ alignment: 'center' }))).toBe(100)
    // Item 3 starts at 300. At the end of 300: 300 - 200 = 100.
    expect(snapTarget(110, 300, 1000, interval({ alignment: 'end' }))).toBe(100)
  })

  test('paging is an interval of the viewport', () => {
    expect(snapTarget(400, 300, 1000, interval({ interval: 300 }))).toBe(300)
  })

  test('offsets snap to the nearest, plus the start and the end', () => {
    expect(snapTarget(140, 300, 1000, offsets([150, 400]))).toBe(150)
    expect(snapTarget(60, 300, 1000, offsets([150, 400]))).toBe(0)
    expect(snapTarget(600, 300, 1000, offsets([150, 400]))).toBe(700)
  })

  test('snapToStart and snapToEnd false free the edges', () => {
    const config = offsets([150, 400], { snapToStart: false, snapToEnd: false })
    expect(snapTarget(60, 300, 1000, config)).toBeUndefined()
    expect(snapTarget(600, 300, 1000, config)).toBeUndefined()
    expect(snapTarget(300, 300, 1000, config)).toBe(400)
  })

  test('nothing configured means no snap', () => {
    expect(snapTarget(130, 300, 1000, interval({ interval: undefined }))).toBeUndefined()
    expect(snapTarget(130, 300, 1000, offsets([]))).toBeUndefined()
  })
})
