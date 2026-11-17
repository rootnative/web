import { afterEach, describe, expect, test, vi } from 'vitest'

import { getAssetByID } from '@rootnative/web/assets-registry'

import { AssetRegistry } from '../src/AssetRegistry.js'
import { DeviceEventEmitter } from '../src/DeviceEventEmitter.js'
import { LogBox } from '../src/LogBox.js'
import { NativeEventEmitter } from '../src/NativeEventEmitter.js'
import { NativeModules } from '../src/NativeModules.js'
import { UIManager } from '../src/UIManager.js'

afterEach(() => {
  DeviceEventEmitter.removeAllListeners()
})

describe('DeviceEventEmitter', () => {
  test('calls each listener of a type with the arguments and the context', () => {
    const context = { name: 'context' }
    const first = vi.fn()
    const second = vi.fn(function () {
      return this
    })
    DeviceEventEmitter.addListener('ping', first)
    DeviceEventEmitter.addListener('ping', second, context)
    DeviceEventEmitter.addListener('other', first)

    DeviceEventEmitter.emit('ping', 1, 'two')

    expect(first).toHaveBeenCalledExactlyOnceWith(1, 'two')
    expect(second).toHaveBeenCalledExactlyOnceWith(1, 'two')
    expect(second.mock.results[0]?.value).toBe(context)
  })

  test('remove, listenerCount, and removeAllListeners', () => {
    const listener = vi.fn()
    const subscription = DeviceEventEmitter.addListener('ping', listener)
    DeviceEventEmitter.addListener('ping', listener)
    DeviceEventEmitter.addListener('other', listener)
    expect(DeviceEventEmitter.listenerCount('ping')).toBe(2)

    subscription.remove()
    expect(DeviceEventEmitter.listenerCount('ping')).toBe(1)
    DeviceEventEmitter.removeAllListeners('ping')
    expect(DeviceEventEmitter.listenerCount('ping')).toBe(0)
    expect(DeviceEventEmitter.listenerCount('other')).toBe(1)
    DeviceEventEmitter.removeAllListeners()
    expect(DeviceEventEmitter.listenerCount('other')).toBe(0)
  })

  test('a listener that an earlier one removes during an emit still runs', () => {
    const later = vi.fn()
    let laterSubscription
    DeviceEventEmitter.addListener('ping', () => laterSubscription.remove())
    laterSubscription = DeviceEventEmitter.addListener('ping', later)

    DeviceEventEmitter.emit('ping')
    DeviceEventEmitter.emit('ping')

    expect(later).toHaveBeenCalledOnce()
  })

  test('throws for a listener that is not a function', () => {
    expect(() => DeviceEventEmitter.addListener('ping', 'not a function')).toThrow(
      '2nd argument must be a function',
    )
  })
})

describe('NativeEventEmitter', () => {
  test('takes a module object, as @expo/log-box gives it, and shares the device emitter', () => {
    const emitter = new NativeEventEmitter({ addListener() {}, removeListeners() {} })
    const listener = vi.fn()
    const subscription = emitter.addListener('change', listener)

    DeviceEventEmitter.emit('change', 'from the device emitter')
    emitter.emit('change', 'from this emitter')
    expect(listener.mock.calls).toEqual([['from the device emitter'], ['from this emitter']])
    expect(emitter.listenerCount('change')).toBe(1)

    subscription.remove()
    expect(emitter.listenerCount('change')).toBe(0)
  })

  test('removeAllListeners needs a type', () => {
    const emitter = new NativeEventEmitter()
    emitter.addListener('change', vi.fn())
    expect(() => emitter.removeAllListeners()).toThrow('requires a non-null argument')
    emitter.removeAllListeners('change')
    expect(emitter.listenerCount('change')).toBe(0)
  })
})

// An element at (10, 20), 30 by 40, in a parent at (4, 5). The tests run in Node, with no DOM.
const fakeElement = () => ({
  getBoundingClientRect: () => ({ left: 10, top: 20, width: 30, height: 40 }),
  parentElement: { getBoundingClientRect: () => ({ left: 4, top: 5, width: 100, height: 100 }) },
  style: {},
  focus: vi.fn(),
  blur: vi.fn(),
})

describe('AssetRegistry', () => {
  test('is the registry of the runtime, as one object', () => {
    const asset = { name: 'logo', type: 'png', httpServerLocation: '/assets', scales: [1] }
    const id = AssetRegistry.registerAsset(asset)
    expect(AssetRegistry.getAssetByID(id)).toBe(asset)
    expect(getAssetByID(id)).toBe(asset)
  })
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
