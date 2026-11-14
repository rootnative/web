import { keyboardSources } from '../apis/Keyboard'

type FakeViewport = EventTarget & {
  width: number
  height: number
  scale: number
  offsetTop: number
}

export type KeyboardStub = {
  /** Shows a keyboard of this height, or hides it with 0, and fires `resize`. */
  setKeyboard: (height: number) => void
  setScale: (scale: number) => void
  /** Moves the viewport down the page, as a browser does to show a field, and fires `scroll`. */
  setOffsetTop: (offsetTop: number) => void
  /** The number of listeners on the viewport. */
  listenerCount: () => number
  restore: () => void
}

// A headless browser shows no keyboard. This viewport shrinks as a phone's does.
export const stubKeyboard = (): KeyboardStub => {
  const root = document.documentElement
  const viewport = Object.assign(new EventTarget(), {
    width: root.clientWidth,
    height: root.clientHeight,
    scale: 1,
    offsetTop: 0,
  }) as FakeViewport
  let listeners = 0
  const add = viewport.addEventListener.bind(viewport)
  const remove = viewport.removeEventListener.bind(viewport)
  viewport.addEventListener = (...args: Parameters<EventTarget['addEventListener']>) => {
    listeners += 1
    add(...args)
  }
  viewport.removeEventListener = (...args: Parameters<EventTarget['removeEventListener']>) => {
    listeners -= 1
    remove(...args)
  }
  const original = keyboardSources.visualViewport
  keyboardSources.visualViewport = () => viewport as unknown as VisualViewport
  let keyboard = 0
  const apply = (): void => {
    viewport.height = (root.clientHeight - keyboard) / viewport.scale
    viewport.dispatchEvent(new Event('resize'))
  }
  return {
    setKeyboard: (height) => {
      keyboard = height
      apply()
    },
    setScale: (scale) => {
      viewport.scale = scale
      apply()
    },
    setOffsetTop: (offsetTop) => {
      viewport.offsetTop = offsetTop
      viewport.dispatchEvent(new Event('scroll'))
    },
    listenerCount: () => listeners,
    restore: () => {
      keyboardSources.visualViewport = original
    },
  }
}

export const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()))
