import { describe, expect, test } from 'vitest'

import { ALIASES, globalDefines, webExtensions } from './index'

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

describe('globalDefines', () => {
  test('sets __DEV__ to true in development', () => {
    expect(globalDefines(false)).toEqual({ __DEV__: 'true' })
  })

  test('sets __DEV__ to false in production', () => {
    expect(globalDefines(true)).toEqual({ __DEV__: 'false' })
  })
})
