import { describe, expect, test, vi } from 'vitest'

import { AnimatedNode } from './AnimatedNode'
import { AnimatedValue } from './AnimatedValue'
import { AnimatedValueXY } from './AnimatedValueXY'

const leafUnder = (parent: AnimatedNode) => {
  const leaf = Object.assign(new AnimatedNode(), { update: vi.fn() })
  parent.__addChild(leaf)
  return leaf
}

describe('AnimatedValueXY', () => {
  test('starts at { x: 0, y: 0 }, or at two numbers, or with two values that it keeps', () => {
    expect(new AnimatedValueXY().__getValue()).toEqual({ x: 0, y: 0 })
    expect(new AnimatedValueXY({ x: 3, y: 4 }).__getValue()).toEqual({ x: 3, y: 4 })

    const x = new AnimatedValue(5)
    const y = new AnimatedValue(6)
    const xy = new AnimatedValueXY({ x, y })
    expect(xy.x).toBe(x)
    expect(xy.y).toBe(y)
  })

  test('throws for a number and a value together', () => {
    expect(() => new AnimatedValueXY({ x: 1, y: new AnimatedValue(2) })).toThrow(
      'AnimatedValueXY must be initialized with an object of numbers or AnimatedValues.',
    )
  })

  test('setValue, setOffset, flattenOffset, and extractOffset act on both values', () => {
    const xy = new AnimatedValueXY()
    xy.setValue({ x: 10, y: 20 })
    xy.setOffset({ x: 1, y: 2 })
    expect(xy.__getValue()).toEqual({ x: 11, y: 22 })

    xy.flattenOffset()
    expect([xy.x.__getValue(), xy.y.__getValue()]).toEqual([11, 22])

    xy.extractOffset()
    xy.setValue({ x: 1, y: 1 })
    expect(xy.__getValue()).toEqual({ x: 12, y: 23 })
  })

  test('a listener gets { x, y } once for each change of x and of y', () => {
    const xy = new AnimatedValueXY()
    const listener = vi.fn()
    const id = xy.addListener(listener)

    xy.setValue({ x: 1, y: 2 })
    expect(listener.mock.calls).toEqual([[{ x: 1, y: 0 }], [{ x: 1, y: 2 }]])

    xy.removeListener(id)
    xy.setValue({ x: 3, y: 4 })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  test('removeAllListeners removes the listeners of x and y too, as in React Native', () => {
    const xy = new AnimatedValueXY()
    const onXY = vi.fn()
    const onX = vi.fn()
    xy.addListener(onXY)
    xy.x.addListener(onX)

    xy.removeAllListeners()
    xy.setValue({ x: 1, y: 1 })

    expect(onXY).not.toHaveBeenCalled()
    expect(onX).not.toHaveBeenCalled()
  })

  test('getLayout and getTranslateTransform give the two values', () => {
    const xy = new AnimatedValueXY()
    expect(xy.getLayout()).toEqual({ left: xy.x, top: xy.y })
    expect(xy.getTranslateTransform()).toEqual([{ translateX: xy.x }, { translateY: xy.y }])
  })

  test('stopAnimation and resetAnimation give { x, y } to the callback', () => {
    const xy = new AnimatedValueXY({ x: 1, y: 2 })
    xy.setValue({ x: 5, y: 6 })
    const stopped = vi.fn()
    const reset = vi.fn()

    xy.stopAnimation(stopped)
    xy.resetAnimation(reset)

    expect(stopped).toHaveBeenCalledExactlyOnceWith({ x: 5, y: 6 })
    expect(reset).toHaveBeenCalledExactlyOnceWith({ x: 1, y: 2 })
  })

  test('joins x and y with its first child, and leaves them with its last child', () => {
    const xy = new AnimatedValueXY()
    const leaf = leafUnder(xy)

    xy.x.setValue(1)
    xy.y.setValue(1)
    expect(leaf.update).toHaveBeenCalledTimes(2)

    xy.__removeChild(leaf)
    expect(xy.x.__getChildren()).toHaveLength(0)
    expect(xy.y.__getChildren()).toHaveLength(0)
  })
})
