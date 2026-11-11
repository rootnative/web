import { describe, expect, test } from 'vitest'

import { splitLayoutProps } from './splitLayoutProps'

describe('splitLayoutProps', () => {
  test('puts the props that place the box in outer, and the rest in inner', () => {
    const { outer, inner } = splitLayoutProps({
      flex: 1,
      height: 200,
      marginTop: 8,
      position: 'absolute',
      gap: 4,
      transform: [{ scale: 2 }],
      padding: 12,
      backgroundColor: 'red',
      borderWidth: 1,
    })
    expect(outer).toEqual({
      flex: 1,
      height: 200,
      marginTop: 8,
      position: 'absolute',
      gap: 4,
      transform: [{ scale: 2 }],
    })
    expect(inner).toEqual({ padding: 12, backgroundColor: 'red', borderWidth: 1 })
  })

  test('gives two empty objects for no style', () => {
    expect(splitLayoutProps(undefined)).toEqual({ outer: {}, inner: {} })
    expect(splitLayoutProps(null)).toEqual({ outer: {}, inner: {} })
  })
})
