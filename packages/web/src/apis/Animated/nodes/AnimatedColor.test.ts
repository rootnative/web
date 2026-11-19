import { describe, expect, test, vi } from 'vitest'

import { AnimatedColor } from './AnimatedColor'
import { AnimatedNode } from './AnimatedNode'
import { AnimatedValue } from './AnimatedValue'

const leafUnder = (parent: AnimatedNode) => {
  const leaf = Object.assign(new AnimatedNode(), { update: vi.fn() })
  parent.__addChild(leaf)
  return leaf
}

describe('AnimatedColor', () => {
  test('starts black, or at a color string, a number, or { r, g, b, a }', () => {
    expect(new AnimatedColor().__getValue()).toBe('rgba(0, 0, 0, 1)')
    expect(new AnimatedColor('red').__getValue()).toBe('rgba(255, 0, 0, 1)')
    expect(new AnimatedColor('#0000ff80').__getValue()).toBe(`rgba(0, 0, 255, ${128 / 255})`)
    expect(new AnimatedColor(0x00ff00ff).__getValue()).toBe('rgba(0, 255, 0, 1)')
    expect(new AnimatedColor({ r: 1, g: 2, b: 3, a: 0.5 }).__getValue()).toBe('rgba(1, 2, 3, 0.5)')
  })

  test('a color that it cannot read gives black, as in React Native', () => {
    expect(new AnimatedColor('var(--accent)').__getValue()).toBe('rgba(0, 0, 0, 1)')
    expect(new AnimatedColor('var(--accent)').nativeColor).toBeNull()
  })

  test('keeps four values that it gets', () => {
    const channels = {
      r: new AnimatedValue(10),
      g: new AnimatedValue(20),
      b: new AnimatedValue(30),
      a: new AnimatedValue(1),
    }
    const color = new AnimatedColor(channels)
    expect(color.r).toBe(channels.r)
    expect(color.a).toBe(channels.a)
    expect(color.__getValue()).toBe('rgba(10, 20, 30, 1)')
  })

  test('setValue updates the leaves and calls each listener once, with the color string', () => {
    const color = new AnimatedColor('red')
    const leaf = leafUnder(color)
    const listener = vi.fn()
    color.addListener(listener)

    color.setValue('blue')

    expect(color.__getValue()).toBe('rgba(0, 0, 255, 1)')
    expect(listener).toHaveBeenCalledExactlyOnceWith({ value: 'rgba(0, 0, 255, 1)' })
    expect(leaf.update).toHaveBeenCalled()
  })

  test('a change of one channel calls the listener', () => {
    const color = new AnimatedColor('black')
    leafUnder(color)
    const listener = vi.fn()
    color.addListener(listener)

    color.g.setValue(128)

    expect(listener).toHaveBeenCalledExactlyOnceWith({ value: 'rgba(0, 128, 0, 1)' })
  })

  test('the offsets act on each channel', () => {
    const color = new AnimatedColor({ r: 10, g: 10, b: 10, a: 0.5 })
    color.setOffset({ r: 1, g: 2, b: 3, a: 0.25 })
    expect(color.__getValue()).toBe('rgba(11, 12, 13, 0.75)')

    color.flattenOffset()
    expect(color.r.__getValue()).toBe(11)
  })

  test('stopAnimation and resetAnimation give the color string to the callback', () => {
    const color = new AnimatedColor('red')
    color.setValue('lime')
    const stopped = vi.fn()
    const reset = vi.fn()

    color.stopAnimation(stopped)
    color.resetAnimation(reset)

    expect(stopped).toHaveBeenCalledExactlyOnceWith('rgba(0, 255, 0, 1)')
    expect(reset).toHaveBeenCalledExactlyOnceWith('rgba(255, 0, 0, 1)')
  })
})
