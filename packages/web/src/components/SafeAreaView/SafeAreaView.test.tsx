import { createRef } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { Text } from '../Text'
import { cleanup, render } from '../../test/render'
import { resetWarnings } from '../../utils/warn'
import type { HostInstance } from '../View/types'
import { SafeAreaView } from './index'

afterEach(() => {
  cleanup()
  resetWarnings()
  vi.restoreAllMocks()
})

const first = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement

// The CSS of each rule that sets a padding on the element.
const paddingRules = (element: Element): string[] => {
  const out: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (!(rule instanceof CSSStyleRule) || !rule.style.getPropertyValue('padding')) continue
      if (element.matches(rule.selectorText)) out.push(rule.cssText)
    }
  }
  return out
}

describe('SafeAreaView', () => {
  test('renders a view with its children', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ref = createRef<HostInstance>()
    const { container } = render(
      <SafeAreaView ref={ref} testID="safe" style={{ flex: 1 }}>
        <Text>Content</Text>
      </SafeAreaView>,
    )
    expect(first(container).tagName).toBe('DIV')
    expect(first(container).dataset['testid']).toBe('safe')
    expect(first(container).textContent).toBe('Content')
    expect(ref.current).toBe(first(container))
  })

  test('pads each physical side with the safe-area inset of that side', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<SafeAreaView />)
    const rule = paddingRules(first(container)).find((css) => css.includes('safe-area'))

    expect(rule).toMatch(
      /padding: env\(safe-area-inset-top\) env\(safe-area-inset-right\) env\(safe-area-inset-bottom\) env\(safe-area-inset-left\)/,
    )
    // A desktop browser has no insets.
    expect(getComputedStyle(first(container)).paddingTop).toBe('0px')
  })

  test('the insets stay on their physical sides in a right-to-left layout', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <div dir="rtl">
        <SafeAreaView />
      </div>,
    )
    const view = (container.firstElementChild as HTMLElement).firstElementChild as HTMLElement
    const rule = paddingRules(view).find((css) => css.includes('safe-area'))
    expect(rule).toContain('env(safe-area-inset-left);')
    expect(rule).not.toContain('inline')
  })

  test('a padding in style wins over the insets', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <>
        <SafeAreaView style={{ paddingTop: 12, paddingHorizontal: 8 }} />
        <SafeAreaView style={{ padding: 4 }} />
      </>,
    )
    const [longhands, shorthand] = Array.from(container.children) as HTMLElement[]
    const style = getComputedStyle(longhands as HTMLElement)
    expect(style.paddingTop).toBe('12px')
    expect(style.paddingLeft).toBe('8px')
    expect(style.paddingRight).toBe('8px')
    expect(getComputedStyle(shorthand as HTMLElement).paddingBottom).toBe('4px')
    expect(paddingRules(shorthand as HTMLElement).join(' ')).not.toContain('safe-area')
  })

  test('warns once in development that it is deprecated, as React Native does', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <>
        <SafeAreaView />
        <SafeAreaView />
      </>,
    )
    expect(warn).toHaveBeenCalledOnce()
    expect(String(warn.mock.calls[0]?.[0])).toContain('SafeAreaView has been deprecated')
    expect(String(warn.mock.calls[0]?.[0])).toContain('react-native-safe-area-context')
  })
})
