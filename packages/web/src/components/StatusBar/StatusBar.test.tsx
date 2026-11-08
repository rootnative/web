import { afterEach, describe, expect, test } from 'vitest'

import { cleanup, render } from '../../test/render'
import { resetStatusBar, StatusBar } from './index'

afterEach(() => {
  cleanup()
  resetStatusBar()
})

const themeColor = (): string | null =>
  document.head.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null

describe('StatusBar', () => {
  test('renders nothing and sets the theme-color meta', () => {
    const { container } = render(<StatusBar backgroundColor="#112233" />)
    expect(container.childNodes).toHaveLength(0)
    expect(themeColor()).toBe('rgb(17,34,51)')
  })

  test('the last mounted StatusBar wins, and unmount restores', () => {
    const { unmount } = render(<StatusBar backgroundColor="red" />)
    const second = render(<StatusBar backgroundColor="blue" />)
    expect(themeColor()).toBe('rgb(0,0,255)')
    second.unmount()
    expect(themeColor()).toBe('rgb(255,0,0)')
    unmount()
    expect(document.head.querySelector('meta[name="theme-color"]')?.hasAttribute('content')).toBe(
      false,
    )
  })

  test('a prop change updates the meta', () => {
    const { rerender } = render(<StatusBar backgroundColor="red" />)
    rerender(<StatusBar backgroundColor="green" />)
    expect(themeColor()).toBe('rgb(0,128,0)')
  })

  test('an existing theme-color is kept as the fallback', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = '#abcdef'
    document.head.appendChild(meta)

    const { unmount } = render(<StatusBar backgroundColor="red" />)
    expect(themeColor()).toBe('rgb(255,0,0)')
    unmount()
    expect(themeColor()).toBe('#abcdef')
    expect(document.head.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1)
  })

  test('setBackgroundColor writes the base, which a mounted StatusBar overrides', () => {
    StatusBar.setBackgroundColor('red')
    expect(themeColor()).toBe('rgb(255,0,0)')
    const { unmount } = render(<StatusBar backgroundColor="blue" />)
    expect(themeColor()).toBe('rgb(0,0,255)')
    unmount()
    expect(themeColor()).toBe('rgb(255,0,0)')
  })

  test('the other statics are accepted', () => {
    expect(StatusBar.currentHeight).toBeNull()
    expect(() => {
      StatusBar.setBarStyle('light-content', true)
      StatusBar.setHidden(true, 'fade')
      StatusBar.setTranslucent(true)
      StatusBar.setNetworkActivityIndicatorVisible(true)
    }).not.toThrow()
  })

  test('the stack API works directly', () => {
    const entry = StatusBar.pushStackEntry({ backgroundColor: 'red' })
    expect(themeColor()).toBe('rgb(255,0,0)')
    const replaced = StatusBar.replaceStackEntry(entry, { backgroundColor: 'blue' })
    expect(themeColor()).toBe('rgb(0,0,255)')
    StatusBar.popStackEntry(replaced)
    expect(document.head.querySelector('meta[name="theme-color"]')?.hasAttribute('content')).toBe(
      false,
    )
  })
})
