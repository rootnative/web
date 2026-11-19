import { afterEach, describe, expect, test, vi } from 'vitest'

import { resetWarnings } from '../../../utils/warn'
import { add } from './AnimatedAddition'
import { diffClamp } from './AnimatedDiffClamp'
import { divide } from './AnimatedDivision'
import { modulo } from './AnimatedModulo'
import { multiply } from './AnimatedMultiplication'
import { AnimatedNode } from './AnimatedNode'
import { subtract } from './AnimatedSubtraction'
import { AnimatedValue } from './AnimatedValue'

// A leaf of the graph, as the props of an animated component are.
const leafUnder = (...parents: AnimatedNode[]) => {
  const leaf = Object.assign(new AnimatedNode(), { update: vi.fn() })
  for (const parent of parents) parent.__addChild(leaf)
  return leaf
}

const unit = { inputRange: [0, 1], outputRange: [0, 1] }

afterEach(() => {
  vi.restoreAllMocks()
  resetWarnings()
})

describe('AnimatedValue', () => {
  test('holds a number, and throws for a value that is not a number', () => {
    expect(new AnimatedValue(3).__getValue()).toBe(3)
    expect(() => new AnimatedValue(undefined as unknown as number)).toThrow(
      'AnimatedValue: Attempting to set value to undefined',
    )
  })

  test('setValue updates the leaves, then calls the listeners with the value and the offset', () => {
    const value = new AnimatedValue(0)
    const leaf = leafUnder(value)
    const listener = vi.fn()
    value.setOffset(10)
    value.addListener(listener)

    value.setValue(5)

    expect(value.__getValue()).toBe(15)
    expect(leaf.update).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledExactlyOnceWith({ value: 15 })
  })

  test('setOffset changes the value but updates nothing until the next change', () => {
    const value = new AnimatedValue(1)
    const leaf = leafUnder(value)
    const listener = vi.fn()
    value.addListener(listener)

    value.setOffset(2)

    expect(value.__getValue()).toBe(3)
    expect(leaf.update).not.toHaveBeenCalled()
    expect(listener).not.toHaveBeenCalled()
  })

  test('flattenOffset and extractOffset move the offset and keep the output', () => {
    const value = new AnimatedValue(4)
    value.setOffset(6)
    value.flattenOffset()
    expect(value.__getValue()).toBe(10)
    value.setValue(3)
    expect(value.__getValue()).toBe(3)

    value.extractOffset()
    expect(value.__getValue()).toBe(3)
    value.setValue(1)
    expect(value.__getValue()).toBe(4)
  })

  test('removeListener removes one listener, and removeAllListeners removes all', () => {
    const value = new AnimatedValue(0)
    const first = vi.fn()
    const second = vi.fn()
    const firstId = value.addListener(first)
    const secondId = value.addListener(second)
    expect(firstId).not.toBe(secondId)
    expect(value.hasListeners()).toBe(true)

    value.removeListener(firstId)
    value.setValue(1)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledExactlyOnceWith({ value: 1 })

    value.removeAllListeners()
    expect(value.hasListeners()).toBe(false)
  })

  test('toJSON and __getAnimatedValue give the value with the offset', () => {
    const value = new AnimatedValue(2)
    value.setOffset(1)
    expect(JSON.stringify({ value })).toBe('{"value":3}')
    expect(value.__getAnimatedValue()).toBe(3)
  })
})

describe('the graph', () => {
  test('a node joins its parent with its first child and leaves it with its last child', () => {
    const value = new AnimatedValue(0)
    const opacity = value.interpolate(unit)
    expect(value.__getChildren()).toHaveLength(0)

    const leaf = leafUnder(opacity)
    expect(value.__getChildren()).toHaveLength(1)
    expect(value.__getChildren()[0]).toBe(opacity)

    opacity.__removeChild(leaf)
    expect(value.__getChildren()).toHaveLength(0)
  })

  test('a listener on a node in the graph gets the output of that node', () => {
    const value = new AnimatedValue(0)
    const rotate = value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
    leafUnder(rotate)
    const listener = vi.fn()
    rotate.addListener(listener)

    value.setValue(0.25)

    expect(listener).toHaveBeenCalledExactlyOnceWith({ value: '90deg' })
  })

  test('a listener on a node that nothing reads never fires, as in React Native', () => {
    const value = new AnimatedValue(0)
    const scale = value.interpolate({ inputRange: [0, 1], outputRange: [1, 2] })
    const listener = vi.fn()
    scale.addListener(listener)

    value.setValue(1)

    expect(listener).not.toHaveBeenCalled()
    expect(scale.__getValue()).toBe(2)
  })

  test('a leaf under two paths from one value updates once', () => {
    const value = new AnimatedValue(0)
    const leaf = leafUnder(value.interpolate(unit), value.interpolate(unit))

    value.setValue(1)

    expect(leaf.update).toHaveBeenCalledTimes(1)
  })

  test('a node warns once when it removes a child that it does not have', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const value = new AnimatedValue(0)
    const stranger = new AnimatedNode()

    value.__removeChild(stranger)
    value.__removeChild(stranger)

    expect(warn).toHaveBeenCalledOnce()
    expect(value.__getChildren()).toHaveLength(0)
  })
})

describe('add and multiply', () => {
  test('combine nodes and numbers', () => {
    const a = new AnimatedValue(2)
    const b = new AnimatedValue(3)
    expect(add(a, b).__getValue()).toBe(5)
    expect(add(a, 10).__getValue()).toBe(12)
    expect(multiply(a, b).__getValue()).toBe(6)
    expect(multiply(-1, b).__getValue()).toBe(-3)
  })

  test('follow each input, and an interpolation of them follows too', () => {
    const x = new AnimatedValue(0)
    const offset = new AnimatedValue(100)
    const translate = add(multiply(x, -1), offset).interpolate({
      inputRange: [0, 100],
      outputRange: ['0px', '50px'],
    })
    const leaf = leafUnder(translate)

    x.setValue(40)
    expect(translate.__getValue()).toBe('30px')
    expect(leaf.update).toHaveBeenCalledTimes(1)

    offset.setValue(140)
    expect(translate.__getValue()).toBe('50px')
    expect(leaf.update).toHaveBeenCalledTimes(2)
  })

  test('a listener on a sum in the graph gets the sum', () => {
    const a = new AnimatedValue(1)
    const sum = add(a, 5)
    leafUnder(sum)
    const listener = vi.fn()
    sum.addListener(listener)

    a.setValue(2)

    expect(listener).toHaveBeenCalledExactlyOnceWith({ value: 7 })
  })
})

describe('subtract, divide, modulo, and diffClamp', () => {
  test('subtract and divide combine nodes and numbers', () => {
    const a = new AnimatedValue(6)
    const b = new AnimatedValue(3)
    expect(subtract(a, b).__getValue()).toBe(3)
    expect(subtract(10, a).__getValue()).toBe(4)
    expect(divide(a, b).__getValue()).toBe(2)
    expect(divide(a, 4).__getValue()).toBe(1.5)
    expect(
      subtract(a, b)
        .interpolate({ inputRange: [0, 6], outputRange: [0, 1] })
        .__getValue(),
    ).toBe(0.5)
  })

  test('a division by zero gives 0 and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const b = new AnimatedValue(2)
    const quotient = divide(10, b)
    expect(warn).not.toHaveBeenCalled()

    b.setValue(0)
    expect(quotient.__getValue()).toBe(0)
    expect(quotient.__getValue()).toBe(0)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]?.[0]).toContain('Detected division by zero')

    divide(1, 0)
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[1]?.[0]).toContain('Detected potential division by zero')
  })

  test('modulo gives a result from 0 up to the modulus, also for a negative input', () => {
    const a = new AnimatedValue(7)
    const rest = modulo(a, 3)
    expect(rest.__getValue()).toBe(1)
    a.setValue(-1)
    expect(rest.__getValue()).toBe(2)
    a.setValue(-6)
    expect(rest.__getValue()).toBe(0)
  })

  test('diffClamp adds each change of its input and clamps the sum, and a second read adds nothing', () => {
    const scroll = new AnimatedValue(0)
    const header = diffClamp(scroll, 0, 50)
    leafUnder(header)
    const steps: [input: number, output: number][] = [
      [30, 30],
      [200, 50],
      [180, 30],
      [-100, 0],
      [-80, 20],
    ]
    for (const [input, output] of steps) {
      scroll.setValue(input)
      expect(header.__getValue()).toBe(output)
      expect(header.__getValue()).toBe(output)
    }
  })

  test('each node follows its inputs, and leaves them with its last child', () => {
    const a = new AnimatedValue(1)
    const b = new AnimatedValue(2)
    const pairs = [subtract(a, b), divide(a, b), modulo(a, 2), diffClamp(a, 0, 10)].map(
      (node) => [node, leafUnder(node)] as const,
    )

    a.setValue(3)
    b.setValue(4)
    expect(pairs.map(([, leaf]) => leaf.update.mock.calls.length)).toEqual([2, 2, 1, 1])

    for (const [node, leaf] of pairs) node.__removeChild(leaf)
    expect(a.__getChildren()).toHaveLength(0)
    expect(b.__getChildren()).toHaveLength(0)
  })
})
