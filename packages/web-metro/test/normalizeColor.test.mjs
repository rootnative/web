import { describe, expect, test } from 'vitest'

import { normalizeColor } from '../src/normalizeColor.js'

describe('normalizeColor', () => {
  test.each([
    ['#123456', 'rgba(18,52,86,1.00)'],
    ['rgb(18, 52, 86)', 'rgba(18,52,86,1.00)'],
    ['rgba(18, 52, 86, 0.5)', 'rgba(18,52,86,0.50)'],
    ['#12345680', 'rgba(18,52,86,0.50)'],
    ['red', 'rgba(255,0,0,1.00)'],
    ['transparent', 'rgba(0,0,0,0.00)'],
    [0x123456ff, 'rgba(18,52,86,1.00)'],
  ])('gives %s as %s', (color, expected) => {
    expect(normalizeColor(color)).toBe(expected)
  })

  test('multiplies the alpha by the opacity', () => {
    expect(normalizeColor('#123456', 0.5)).toBe('rgba(18,52,86,0.50)')
    expect(normalizeColor('rgba(18, 52, 86, 0.5)', 0.5)).toBe('rgba(18,52,86,0.25)')
  })

  test.each(['currentcolor', 'currentColor', 'inherit', 'var(--page)'])(
    'keeps the web color %s as it is',
    (color) => {
      expect(normalizeColor(color)).toBe(color)
    },
  )

  test.each([undefined, null, '', 'not a color', {}])('gives undefined for %s', (color) => {
    expect(normalizeColor(color)).toBeUndefined()
  })
})
