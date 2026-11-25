import { describe, expect, test } from 'vitest'

import { snapPositions, snapTarget, type SnapConfig } from './snap'

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

describe('snapPositions', () => {
  test('interval gives each multiple, and the end of the content', () => {
    expect(snapPositions(0, 300, 1000, interval(), 100)).toEqual([
      0, 100, 200, 300, 400, 500, 600, 700,
    ])
    expect(snapPositions(0, 300, 1050, interval(), 100)).toEqual([
      0, 100, 200, 300, 400, 500, 600, 700, 750,
    ])
  })

  test('center alignment shifts each position', () => {
    // Items of 100 centered in 300: item 1 at 0, item 2 at 100, and so on.
    expect(snapPositions(0, 300, 1000, interval({ alignment: 'center' }), 100)).toEqual([
      0, 100, 200, 300, 400, 500, 600, 700,
    ])
    // Items of 120: item 1 centered is 30. No offset snaps to item 0, so 0 isn't a position.
    expect(
      snapPositions(0, 300, 1000, interval({ interval: 120, alignment: 'center' }), 100),
    ).toEqual([30, 150, 270, 390, 510, 630, 700])
  })

  test('each position is a place where snapTarget leaves the scroll', () => {
    const configs = [
      interval(),
      interval({ interval: 120, alignment: 'center' }),
      interval({ interval: 130, alignment: 'end' }),
      offsets([150, 400, 520]),
    ]
    for (const config of configs) {
      for (const position of snapPositions(0, 300, 1000, config, 100)) {
        expect(snapTarget(position, 300, 1000, config)).toBeUndefined()
      }
    }
  })

  test('each place where snapTarget settles is a position', () => {
    const configs = [
      interval(),
      interval({ interval: 120, alignment: 'center' }),
      interval({ interval: 130, alignment: 'end' }),
      offsets([150, 400, 520]),
    ]
    for (const config of configs) {
      const positions = snapPositions(0, 300, 1000, config, 100)
      for (let offset = 0; offset <= 700; offset += 5) {
        expect(positions).toContain(snapTarget(offset, 300, 1000, config) ?? offset)
      }
    }
  })

  test('offsets add the start and the end of the content', () => {
    expect(snapPositions(0, 300, 1000, offsets([400, 150, 900]), 100)).toEqual([0, 150, 400, 700])
  })

  test('limit keeps that many on each side of the scroll offset', () => {
    expect(snapPositions(5000, 300, 100_000, interval(), 2)).toEqual([4800, 4900, 5000, 5100])
    expect(snapPositions(5050, 300, 100_000, interval(), 2)).toEqual([4900, 5000, 5100, 5200])
  })

  test("nothing when the browser can't express the config, or nothing snaps", () => {
    expect(snapPositions(0, 300, 1000, offsets([150], { snapToStart: false }), 100)).toEqual([])
    expect(snapPositions(0, 300, 1000, offsets([150], { snapToEnd: false }), 100)).toEqual([])
    expect(snapPositions(0, 300, 1000, offsets([]), 100)).toEqual([])
    expect(snapPositions(0, 300, 1000, interval({ interval: undefined }), 100)).toEqual([])
    expect(snapPositions(0, 300, 300, interval(), 100)).toEqual([])
  })
})
