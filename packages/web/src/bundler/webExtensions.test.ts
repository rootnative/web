import { describe, expect, test } from 'vitest'

import { ALIASES, webExtensions } from './index'

describe('webExtensions', () => {
  test('puts a .web variant of each extension first', () => {
    expect(webExtensions(['.js', '.ts', '.tsx'])).toEqual([
      '.web.js',
      '.web.ts',
      '.web.tsx',
      '.js',
      '.ts',
      '.tsx',
    ])
  })

  test('keeps a .web extension that is already in the list once', () => {
    expect(webExtensions(['.web.js', '.js'])).toEqual(['.web.js', '.js'])
  })
})

describe('ALIASES', () => {
  test('points react-native at this package', () => {
    expect(ALIASES).toEqual({ 'react-native': '@rootnative/web' })
  })
})
