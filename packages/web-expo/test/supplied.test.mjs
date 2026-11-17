import { describe, expect, test, vi } from 'vitest'

import { LogBox } from '../src/LogBox.js'
import { NativeModules } from '../src/NativeModules.js'
import { UIManager } from '../src/UIManager.js'

// An element at (10, 20), 30 by 40, in a parent at (4, 5). The tests run in Node, with no DOM.
const fakeElement = () => ({
  getBoundingClientRect: () => ({ left: 10, top: 20, width: 30, height: 40 }),
  parentElement: { getBoundingClientRect: () => ({ left: 4, top: 5, width: 100, height: 100 }) },
  style: {},
  focus: vi.fn(),
  blur: vi.fn(),
})

describe('NativeModules', () => {
  test('has no native module, so a lookup such as EXDevLauncher is undefined', () => {
    expect(NativeModules.EXDevLauncher).toBeUndefined()
    expect(NativeModules.UIManager).toBe(UIManager)
  })
})

describe('LogBox', () => {
  test('each method does nothing', () => {
    expect(LogBox.ignoreLogs(['a warning'])).toBeUndefined()
    expect(LogBox.ignoreAllLogs()).toBeUndefined()
    expect(LogBox.install()).toBeUndefined()
    expect(LogBox.uninstall()).toBeUndefined()
  })
})

describe('UIManager', () => {
  test('measure gives the place in the parent, the size, and the place in the page', () => {
    const callback = vi.fn()
    UIManager.measure(fakeElement(), callback)
    expect(callback).toHaveBeenCalledExactlyOnceWith(6, 15, 30, 40, 10, 20)
  })

  test('measureInWindow gives the place in the window and the size', () => {
    const callback = vi.fn()
    UIManager.measureInWindow(fakeElement(), callback)
    expect(callback).toHaveBeenCalledExactlyOnceWith(10, 20, 30, 40)
  })

  test('updateView writes the style inline', () => {
    const element = fakeElement()
    UIManager.updateView(element, { style: { opacity: 0.5 } })
    expect(element.style.opacity).toBe('0.5')
  })

  test('focus and blur call the element', () => {
    const element = fakeElement()
    UIManager.focus(element)
    UIManager.blur(element)
    expect(element.focus).toHaveBeenCalledOnce()
    expect(element.blur).toHaveBeenCalledOnce()
  })

  test('a node that is not an element measures nothing, and measureLayout fails', () => {
    const callback = vi.fn()
    const onFail = vi.fn()
    UIManager.measure(42, callback)
    UIManager.measureInWindow(null, callback)
    UIManager.measureLayout(undefined, null, onFail, callback)
    expect(callback).not.toHaveBeenCalled()
    expect(onFail).toHaveBeenCalledOnce()
  })

  test('the next layout animation ends at once', () => {
    const onEnd = vi.fn()
    UIManager.configureNextLayoutAnimation({ duration: 300 }, onEnd)
    expect(onEnd).toHaveBeenCalledOnce()
    expect(UIManager.setLayoutAnimationEnabledExperimental(true)).toBeUndefined()
  })
})
