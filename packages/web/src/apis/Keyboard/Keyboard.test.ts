import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { stubNavigator } from '../../test/navigator'
import { nextFrame, stubKeyboard, type KeyboardStub } from '../../test/keyboard'
import { Keyboard, type KeyboardEvent } from './index'

const root = document.documentElement
let stub: KeyboardStub
const fields: HTMLElement[] = []

const field = (html = '<input type="text">'): HTMLElement => {
  const template = document.createElement('template')
  template.innerHTML = html
  const element = template.content.firstElementChild as HTMLElement
  document.body.appendChild(element)
  fields.push(element)
  return element
}

beforeEach(() => {
  stub = stubKeyboard()
})

afterEach(() => {
  Keyboard.removeAllListeners()
  stub.restore()
  for (const element of fields) element.remove()
  fields.length = 0
})

describe('Keyboard with no listener', () => {
  test('is hidden while no keyboard covers the page', () => {
    field().focus()
    expect(Keyboard.isVisible()).toBe(false)
    expect(Keyboard.metrics()).toBeUndefined()
  })

  test('reads the keyboard from the visual viewport while a text field has the focus', () => {
    field().focus()
    stub.setKeyboard(300)
    expect(Keyboard.isVisible()).toBe(true)
    expect(Keyboard.metrics()).toEqual({
      screenX: 0,
      screenY: root.clientHeight - 300,
      width: root.clientWidth,
      height: 300,
    })
  })

  test('is hidden when no text field has the focus', () => {
    stub.setKeyboard(300)
    expect(Keyboard.isVisible()).toBe(false)
    field('<input type="checkbox">').focus()
    expect(Keyboard.isVisible()).toBe(false)
    field('<input type="text" readonly>').focus()
    expect(Keyboard.isVisible()).toBe(false)
    field('<div contenteditable="true"></div>').focus()
    expect(Keyboard.isVisible()).toBe(true)
  })

  test('counts a pinch zoom as no keyboard, and a keyboard under a zoom at its height', () => {
    field().focus()
    stub.setScale(2)
    expect(Keyboard.isVisible()).toBe(false)
    stub.setKeyboard(300)
    expect(Keyboard.metrics()?.height).toBe(300)
  })
})

describe('Keyboard events', () => {
  test('fire keyboardDidShow and keyboardDidHide as on Android', async () => {
    const shown: KeyboardEvent[] = []
    const hidden: KeyboardEvent[] = []
    Keyboard.addListener('keyboardDidShow', (event) => shown.push(event))
    Keyboard.addListener('keyboardDidHide', (event) => hidden.push(event))
    field().focus()

    stub.setKeyboard(300)
    await nextFrame()
    expect(shown).toEqual([
      {
        duration: 0,
        easing: 'keyboard',
        endCoordinates: {
          screenX: 0,
          screenY: root.clientHeight - 300,
          width: root.clientWidth,
          height: 300,
        },
      },
    ])
    expect(Keyboard.isVisible()).toBe(true)

    stub.setKeyboard(0)
    await nextFrame()
    expect(hidden).toEqual([
      {
        duration: 0,
        easing: 'keyboard',
        endCoordinates: {
          screenX: 0,
          screenY: root.clientHeight,
          width: root.clientWidth,
          height: 0,
        },
      },
    ])
    expect(Keyboard.isVisible()).toBe(false)
    expect(Keyboard.metrics()).toBeUndefined()
  })

  test('fire keyboardDidShow again for a new height, and once for each frame', async () => {
    const heights: number[] = []
    Keyboard.addListener('keyboardDidShow', (event) => heights.push(event.endCoordinates.height))
    field().focus()

    stub.setKeyboard(100)
    stub.setKeyboard(200)
    await nextFrame()
    stub.setKeyboard(280)
    await nextFrame()
    stub.setKeyboard(280)
    await nextFrame()
    expect(heights).toEqual([200, 280])
  })

  test('never fire the Will and ChangeFrame events', async () => {
    const listener = vi.fn()
    for (const name of [
      'keyboardWillShow',
      'keyboardWillHide',
      'keyboardWillChangeFrame',
      'keyboardDidChangeFrame',
    ] as const) {
      Keyboard.addListener(name, listener)
    }
    field().focus()
    stub.setKeyboard(300)
    await nextFrame()
    stub.setKeyboard(0)
    await nextFrame()
    expect(listener).not.toHaveBeenCalled()
  })

  test('stop after remove and removeAllListeners', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const subscription = Keyboard.addListener('keyboardDidShow', first)
    Keyboard.addListener('keyboardDidShow', second)
    field().focus()

    subscription.remove()
    stub.setKeyboard(300)
    await nextFrame()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)

    Keyboard.removeAllListeners('keyboardDidShow')
    stub.setKeyboard(0)
    await nextFrame()
    stub.setKeyboard(250)
    await nextFrame()
    expect(second).toHaveBeenCalledTimes(1)
  })
})

describe('Keyboard with the VirtualKeyboard API', () => {
  test('reads the rectangle of the keyboard when the app sets overlaysContent', async () => {
    const virtualKeyboard = Object.assign(new EventTarget(), {
      overlaysContent: true,
      boundingRect: new DOMRect(0, 0, 0, 0),
    })
    const undo = stubNavigator('virtualKeyboard', virtualKeyboard)
    try {
      const listener = vi.fn()
      Keyboard.addListener('keyboardDidShow', listener)
      virtualKeyboard.boundingRect = new DOMRect(0, 500, 400, 320)
      virtualKeyboard.dispatchEvent(new Event('geometrychange'))
      await nextFrame()
      expect(listener).toHaveBeenCalledWith({
        duration: 0,
        easing: 'keyboard',
        endCoordinates: { screenX: 0, screenY: 500, width: 400, height: 320 },
      })
    } finally {
      Keyboard.removeAllListeners()
      undo()
    }
  })
})

describe('Keyboard.dismiss', () => {
  test('blurs the focused text field', () => {
    const input = field()
    input.focus()
    Keyboard.dismiss()
    expect(document.activeElement).not.toBe(input)
  })

  test('leaves the focus on an element that takes no text', () => {
    const button = field('<button>Go</button>')
    button.focus()
    Keyboard.dismiss()
    expect(document.activeElement).toBe(button)
  })
})

test('scheduleLayoutAnimation does nothing', () => {
  expect(() =>
    Keyboard.scheduleLayoutAnimation({
      duration: 250,
      easing: 'keyboard',
      endCoordinates: { screenX: 0, screenY: 0, width: 0, height: 0 },
      startCoordinates: { screenX: 0, screenY: 0, width: 0, height: 0 },
      isEventFromThisApp: true,
    }),
  ).not.toThrow()
})
