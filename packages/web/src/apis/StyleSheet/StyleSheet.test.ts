import { describe, expect, test } from 'vitest'

import { StyleSheet } from './index'

describe('StyleSheet', () => {
  test('create returns the same object, frozen', () => {
    const input = { box: { width: 10 } }
    const styles = StyleSheet.create(input)
    expect(styles).toBe(input)
    expect(Object.isFrozen(styles)).toBe(true)
    expect(Object.isFrozen(styles.box)).toBe(true)
  })

  describe('flatten', () => {
    test('returns undefined for empty input', () => {
      expect(StyleSheet.flatten(null)).toBeUndefined()
      expect(StyleSheet.flatten(undefined)).toBeUndefined()
      expect(StyleSheet.flatten([])).toBeUndefined()
      expect(StyleSheet.flatten([false, null, ''])).toBeUndefined()
    })

    test('returns a single object as it is', () => {
      const style = { width: 1 }
      expect(StyleSheet.flatten(style)).toBe(style)
    })

    test('merges arrays, later entries win', () => {
      expect(StyleSheet.flatten([{ width: 1, height: 1 }, { width: 2 }])).toEqual({
        width: 2,
        height: 1,
      })
    })

    test('merges nested arrays and skips falsy entries', () => {
      expect(
        StyleSheet.flatten([{ a: 1 }, [false, { b: 2 }, [{ c: 3 }]], null, undefined]),
      ).toEqual({ a: 1, b: 2, c: 3 })
    })

    test('does not mutate the inputs', () => {
      const first = { width: 1 }
      StyleSheet.flatten([first, { width: 2 }])
      expect(first).toEqual({ width: 1 })
    })
  })

  describe('compose', () => {
    type Box = { width?: number; height?: number }

    test('returns the array of both when both are set', () => {
      const a: Box = { width: 1 }
      const b: Box = { height: 2 }
      expect(StyleSheet.compose(a, b)).toEqual([a, b])
    })

    test('returns the one that is set', () => {
      const a: Box = { width: 1 }
      expect(StyleSheet.compose(a, null)).toBe(a)
      expect(StyleSheet.compose(undefined, a)).toBe(a)
    })
  })

  test('absoluteFill covers the parent', () => {
    expect(StyleSheet.absoluteFillObject).toEqual({
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    })
    expect(StyleSheet.absoluteFill).toEqual(StyleSheet.absoluteFillObject)
    expect(Object.isFrozen(StyleSheet.absoluteFill)).toBe(true)
  })

  test('hairlineWidth is one pixel', () => {
    expect(StyleSheet.hairlineWidth).toBe(1)
  })
})
