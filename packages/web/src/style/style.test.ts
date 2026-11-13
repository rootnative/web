import { afterEach, describe, expect, test } from 'vitest'

import { StyleSheet } from '../apis/StyleSheet'
import createDefault, {
  createReactDOMStyle,
  createTextShadowValue,
  createTransformValue,
} from './index'

const elements: HTMLElement[] = []

afterEach(() => {
  for (const element of elements) element.remove()
  elements.length = 0
})

// Writes the values as Reanimated does: one property at a time, in the order of the object.
const applyInline = (declarations: Record<string, string>): CSSStyleDeclaration => {
  const element = document.createElement('div')
  document.body.appendChild(element)
  elements.push(element)
  for (const name in declarations) {
    ;(element.style as unknown as Record<string, string>)[name] = declarations[name] as string
  }
  return getComputedStyle(element)
}

describe('createReactDOMStyle', () => {
  test('resolves React Native values to CSS values', () => {
    expect(
      createReactDOMStyle({
        width: 40,
        opacity: 0.5,
        backgroundColor: 'red',
        transform: [{ translateX: 10 }, { scale: 2 }],
        fontWeight: 'bold',
      }),
    ).toEqual({
      width: '40px',
      opacity: '0.5',
      backgroundColor: 'rgb(255,0,0)',
      transform: 'translateX(10px) scale(2)',
      fontWeight: 'bold',
    })
  })

  test('works on an element when written one property at a time', () => {
    const computed = applyInline(
      createReactDOMStyle({
        width: 40,
        height: 20,
        transform: [{ rotate: '90deg' }],
        opacity: 0.25,
      }),
    )
    expect(computed.width).toBe('40px')
    expect(computed.height).toBe('20px')
    expect(computed.opacity).toBe('0.25')
    expect(computed.transform).not.toBe('none')
  })

  test('puts shorthands first, so a longhand wins whatever the input order', () => {
    const declarations = createReactDOMStyle({
      marginLeft: 8,
      margin: 2,
      paddingVertical: 6,
      padding: 1,
    })
    const names = Object.keys(declarations)
    expect(names.indexOf('margin')).toBeLessThan(names.indexOf('marginLeft'))
    expect(names.indexOf('padding')).toBeLessThan(names.indexOf('paddingTop'))
    const computed = applyInline(declarations)
    expect(computed.marginLeft).toBe('8px')
    expect(computed.marginRight).toBe('2px')
    expect(computed.paddingTop).toBe('6px')
    expect(computed.paddingLeft).toBe('1px')
  })

  test('flattens an array and a StyleSheet style, and takes nothing', () => {
    const styles = StyleSheet.create({ box: { width: 10 } })
    expect(createReactDOMStyle([styles.box, { height: 5 }, false])).toEqual({
      width: '10px',
      height: '5px',
    })
    expect(createReactDOMStyle(null)).toEqual({})
    expect(createReactDOMStyle(undefined)).toEqual({})
  })

  test('turns the text shadow props into one value', () => {
    expect(
      createReactDOMStyle({ textShadowColor: 'black', textShadowOffset: { width: 1, height: 2 } }),
    ).toEqual({ textShadow: expect.stringMatching(/^1px 2px 0px /) })
  })

  test('is the default export, as in the react-native-web module', () => {
    expect(createDefault).toBe(createReactDOMStyle)
  })
})

describe('createTransformValue', () => {
  test('turns a transform array into a CSS value', () => {
    expect(createTransformValue([{ translateY: -4 }, { rotate: '45deg' }])).toBe(
      'translateY(-4px) rotate(45deg)',
    )
  })

  test('is empty for a value with no transform', () => {
    expect(createTransformValue(undefined)).toBe('')
    expect(createTransformValue(3)).toBe('')
  })
})

describe('createTextShadowValue', () => {
  test('turns the three props into a CSS value', () => {
    expect(
      createTextShadowValue({
        textShadowColor: 'red',
        textShadowOffset: { width: 2, height: 3 },
        textShadowRadius: 4,
      }),
    ).toBe('2px 3px 4px rgb(255,0,0)')
  })

  test('is undefined for a color it cannot parse', () => {
    expect(createTextShadowValue({ textShadowColor: 'not a color' })).toBeUndefined()
  })
})
