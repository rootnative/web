import { describe, expect, test } from 'vitest'

import { resolveStyle } from './resolveStyle'
import { setLeftAndRightSwap } from './direction'

describe('resolveStyle', () => {
  test('skips undefined and null values', () => {
    expect(resolveStyle({ width: undefined, height: null })).toEqual({})
  })

  describe('units', () => {
    test('adds px to numbers', () => {
      expect(resolveStyle({ width: 10, marginTop: 4.5 })).toEqual({
        width: '10px',
        marginTop: '4.5px',
      })
    })

    test('keeps zero without a unit', () => {
      expect(resolveStyle({ padding: 0 })).toEqual({ padding: '0' })
    })

    test('keeps strings as they are', () => {
      expect(resolveStyle({ width: '50%', height: 'auto' })).toEqual({
        width: '50%',
        height: 'auto',
      })
    })

    test('keeps unitless properties as numbers', () => {
      expect(resolveStyle({ opacity: 0.5, zIndex: 2, flexGrow: 1, aspectRatio: 1.5 })).toEqual({
        opacity: '0.5',
        zIndex: '2',
        flexGrow: '1',
        aspectRatio: '1.5',
      })
    })
  })

  describe('flex', () => {
    test('positive flex grows with a zero basis, as on native', () => {
      expect(resolveStyle({ flex: 1 })).toEqual({ flex: '1 1 0%' })
      expect(resolveStyle({ flex: 2 })).toEqual({ flex: '2 1 0%' })
    })

    test('flex 0 keeps the intrinsic size', () => {
      expect(resolveStyle({ flex: 0 })).toEqual({ flex: '0 0 auto' })
    })

    test('negative flex only shrinks', () => {
      expect(resolveStyle({ flex: -1 })).toEqual({ flex: '0 1 auto' })
    })
  })

  describe('colors', () => {
    test('normalizes named, hex, and packed colors to rgb', () => {
      expect(resolveStyle({ color: 'red' })).toEqual({ color: 'rgb(255,0,0)' })
      expect(resolveStyle({ backgroundColor: '#0f0' })).toEqual({
        backgroundColor: 'rgb(0,255,0)',
      })
      expect(resolveStyle({ borderColor: 0x0000ffff })).toEqual({ borderColor: 'rgb(0,0,255)' })
    })

    test('keeps alpha', () => {
      expect(resolveStyle({ color: 'rgba(0, 0, 0, 0.5)' })).toEqual({ color: 'rgba(0,0,0,0.502)' })
      expect(resolveStyle({ color: '#ff000080' })).toEqual({ color: 'rgba(255,0,0,0.502)' })
    })

    test('drops an invalid color', () => {
      expect(resolveStyle({ color: 'not-a-color' })).toEqual({})
    })
  })

  describe('shorthands and renames', () => {
    test('expands horizontal and vertical margin and padding', () => {
      expect(resolveStyle({ marginHorizontal: 8, paddingVertical: '1em' })).toEqual({
        marginInlineStart: '8px',
        marginInlineEnd: '8px',
        paddingTop: '1em',
        paddingBottom: '1em',
      })
    })

    test('maps left and right to logical properties, as Fabric swaps them in RTL', () => {
      expect(
        resolveStyle({
          left: 1,
          right: 2,
          marginLeft: 3,
          paddingRight: 4,
          borderLeftWidth: 5,
          borderRightColor: 'red',
          borderTopLeftRadius: 6,
          borderBottomRightRadius: 7,
          top: 8,
        }),
      ).toEqual({
        insetInlineStart: '1px',
        insetInlineEnd: '2px',
        marginInlineStart: '3px',
        paddingInlineEnd: '4px',
        borderInlineStartWidth: '5px',
        borderInlineEndColor: 'rgb(255,0,0)',
        borderStartStartRadius: '6px',
        borderEndEndRadius: '7px',
        top: '8px',
      })
    })

    test('a start or end style wins over left or right, in any key order', () => {
      expect(resolveStyle({ start: 1, left: 2 })).toEqual({ insetInlineStart: '1px' })
      expect(resolveStyle({ marginRight: 2, marginEnd: 1 })).toEqual({ marginInlineEnd: '1px' })
      expect(resolveStyle({ paddingStart: 1, paddingHorizontal: 2 })).toEqual({
        paddingInlineStart: '1px',
        paddingInlineEnd: '2px',
      })
    })

    test('keeps left and right physical when the swap is off', () => {
      setLeftAndRightSwap(false)
      try {
        expect(resolveStyle({ left: 1, marginRight: 2, borderTopLeftRadius: 3 })).toEqual({
          left: '1px',
          marginRight: '2px',
          borderTopLeftRadius: '3px',
        })
      } finally {
        setLeftAndRightSwap(true)
      }
    })

    test('maps start and end to logical properties', () => {
      expect(
        resolveStyle({
          marginStart: 1,
          paddingEnd: 2,
          start: 3,
          end: 4,
          borderStartWidth: 5,
          borderEndColor: 'red',
          borderTopStartRadius: 6,
          borderBottomEndRadius: 7,
        }),
      ).toEqual({
        marginInlineStart: '1px',
        paddingInlineEnd: '2px',
        insetInlineStart: '3px',
        insetInlineEnd: '4px',
        borderInlineStartWidth: '5px',
        borderInlineEndColor: 'rgb(255,0,0)',
        borderStartStartRadius: '6px',
        borderEndEndRadius: '7px',
      })
    })

    test('maps writingDirection to direction', () => {
      expect(resolveStyle({ writingDirection: 'rtl' })).toEqual({ direction: 'rtl' })
    })
  })

  describe('transform', () => {
    test('builds a transform string from the array form', () => {
      expect(
        resolveStyle({
          transform: [{ translateX: 10 }, { rotate: '45deg' }, { scale: 2 }, { skewX: '10deg' }],
        }),
      ).toEqual({ transform: 'translateX(10px) rotate(45deg) scale(2) skewX(10deg)' })
    })

    test('supports matrix and translate', () => {
      expect(
        resolveStyle({ transform: [{ matrix: [1, 0, 0, 1, 0, 0] }, { translate: [1, 2] }] }),
      ).toEqual({ transform: 'matrix(1,0,0,1,0,0) translate(1px,2px)' })
    })

    test('keeps the string form', () => {
      expect(resolveStyle({ transform: 'rotate(1turn)' })).toEqual({ transform: 'rotate(1turn)' })
    })

    test('an empty array is none', () => {
      expect(resolveStyle({ transform: [] })).toEqual({ transform: 'none' })
    })

    test('transformOrigin accepts an array or a string', () => {
      expect(resolveStyle({ transformOrigin: [10, '50%', 0] })).toEqual({
        transformOrigin: '10px 50% 0',
      })
      expect(resolveStyle({ transformOrigin: 'top left' })).toEqual({
        transformOrigin: 'top left',
      })
    })
  })

  describe('shadows', () => {
    test('legacy shadow props become one box-shadow', () => {
      expect(
        resolveStyle({
          shadowColor: 'black',
          shadowOffset: { width: 1, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 3,
        }),
      ).toEqual({ boxShadow: '1px 2px 3px rgba(0,0,0,0.5)' })
    })

    test('boxShadow wins over the legacy props', () => {
      expect(resolveStyle({ shadowRadius: 3, boxShadow: '0 0 1px red' })).toEqual({
        boxShadow: '0 0 1px red',
      })
    })

    test('boxShadow array form', () => {
      expect(
        resolveStyle({
          boxShadow: [
            { offsetX: 1, offsetY: 2, blurRadius: 3, spreadDistance: 4, color: 'red' },
            { offsetX: 0, offsetY: 0, inset: true },
          ],
        }),
      ).toEqual({ boxShadow: '1px 2px 3px 4px rgb(255,0,0), 0 0 0 0 rgb(0,0,0) inset' })
    })

    test('text shadow props become one text-shadow', () => {
      expect(
        resolveStyle({
          textShadowColor: 'red',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
        }),
      ).toEqual({ textShadow: '1px 1px 2px rgb(255,0,0)' })
    })
  })

  describe('filter', () => {
    test('builds a filter string from the array form', () => {
      expect(
        resolveStyle({
          filter: [
            { blur: 2 },
            { brightness: 1.2 },
            { hueRotate: 90 },
            { dropShadow: { offsetX: 1, offsetY: 2, standardDeviation: 3, color: 'red' } },
          ],
        }),
      ).toEqual({
        filter: 'blur(2px) brightness(1.2) hue-rotate(90deg) drop-shadow(1px 2px 3px rgb(255,0,0))',
      })
    })
  })

  describe('text', () => {
    test('maps named font weights to numbers', () => {
      expect(resolveStyle({ fontWeight: 'semibold' })).toEqual({ fontWeight: '600' })
      expect(resolveStyle({ fontWeight: 700 })).toEqual({ fontWeight: '700' })
      expect(resolveStyle({ fontWeight: 'bold' })).toEqual({ fontWeight: 'bold' })
    })

    test('joins fontVariant', () => {
      expect(resolveStyle({ fontVariant: ['small-caps', 'tabular-nums'] })).toEqual({
        fontVariant: 'small-caps tabular-nums',
      })
    })

    test('formats fontVariationSettings', () => {
      expect(resolveStyle({ fontVariationSettings: [{ axis: 'wght', value: 600 }] })).toEqual({
        fontVariationSettings: "'wght' 600",
      })
    })

    test('lineHeight and letterSpacing are lengths', () => {
      expect(resolveStyle({ lineHeight: 20, letterSpacing: 1 })).toEqual({
        lineHeight: '20px',
        letterSpacing: '1px',
      })
    })

    test('textAlignVertical maps to verticalAlign', () => {
      expect(resolveStyle({ textAlignVertical: 'center' })).toEqual({ verticalAlign: 'middle' })
    })
  })

  describe('image', () => {
    test('resizeMode maps to objectFit, and objectFit wins', () => {
      expect(resolveStyle({ resizeMode: 'stretch' })).toEqual({ objectFit: 'fill' })
      expect(resolveStyle({ objectFit: 'contain', resizeMode: 'cover' })).toEqual({
        objectFit: 'contain',
      })
    })
  })

  describe('native-only properties', () => {
    test('are dropped', () => {
      expect(
        resolveStyle({
          elevation: 4,
          includeFontPadding: false,
          tintColor: 'red',
          borderCurve: 'continuous',
        }),
      ).toEqual({})
    })
  })

  test('leaves the box values of pointerEvents to the compiler', () => {
    expect(resolveStyle({ pointerEvents: 'box-none' })).toEqual({})
    expect(resolveStyle({ pointerEvents: 'box-only' })).toEqual({})
    expect(resolveStyle({ pointerEvents: 'auto' })).toEqual({ pointerEvents: 'auto' })
  })

  describe('pass-through properties', () => {
    test('keeps modern CSS values', () => {
      expect(
        resolveStyle({
          display: 'contents',
          position: 'static',
          mixBlendMode: 'multiply',
          isolation: 'isolate',
          boxSizing: 'border-box',
          userSelect: 'none',
          pointerEvents: 'none',
          cursor: 'pointer',
          gap: 8,
          inset: 0,
        }),
      ).toEqual({
        display: 'contents',
        position: 'static',
        mixBlendMode: 'multiply',
        isolation: 'isolate',
        boxSizing: 'border-box',
        userSelect: 'none',
        pointerEvents: 'none',
        cursor: 'pointer',
        gap: '8px',
        inset: '0',
      })
    })
  })
})
