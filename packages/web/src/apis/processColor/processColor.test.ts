import { describe, expect, test } from 'vitest'

import { processColor } from './index'

describe('processColor', () => {
  test('returns ARGB for names, hex, rgb(), and rgba()', () => {
    expect(processColor('red')).toBe(0xffff0000)
    expect(processColor('#00ff00')).toBe(0xff00ff00)
    expect(processColor('rgb(0, 0, 255)')).toBe(0xff0000ff)
    expect(processColor('rgba(0, 0, 0, 0.5)')).toBe(0x80000000)
    expect(processColor('transparent')).toBe(0)
  })

  test('a number is RGBA, as React Native reads it, and comes out ARGB', () => {
    expect(processColor(0x112233ff)).toBe(0xff112233)
  })

  test('null and undefined stay, an invalid color is null', () => {
    expect(processColor(null)).toBeNull()
    expect(processColor(undefined)).toBeUndefined()
    expect(processColor('not a color')).toBeNull()
    expect(processColor({})).toBeNull()
  })
})
