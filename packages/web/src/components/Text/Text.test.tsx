import { createRef } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { LONGHAND_STYLE_ID } from '../../style/registry'
import { cleanup, render } from '../../test/render'
import { View } from '../View'
import { Text } from './index'

afterEach(cleanup)

const first = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement

describe('Text', () => {
  test('renders a span with the native reset', () => {
    const { container } = render(<Text>Hello</Text>)
    const element = first(container)
    expect(element.tagName).toBe('SPAN')
    expect(element.textContent).toBe('Hello')
    const computed = getComputedStyle(element)
    expect(computed.display).toBe('inline')
    expect(computed.fontSize).toBe('14px')
    expect(computed.color).toBe('rgb(0, 0, 0)')
    expect(computed.whiteSpace).toBe('pre-wrap')
    expect(computed.fontFamily).toContain('system-ui')
  })

  test('is a block-level flex item inside a View', () => {
    const { container } = render(
      <View>
        <Text>Hello</Text>
      </View>,
    )
    const text = first(container).firstElementChild as HTMLElement
    expect(getComputedStyle(text).display).toBe('block')
  })

  test('a nested Text inherits from its parent', () => {
    const { container } = render(
      <Text style={{ color: 'red', fontSize: 20, textDecorationLine: 'underline' }}>
        a<Text>b</Text>
        <Text style={{ fontSize: 10 }}>c</Text>
      </Text>,
    )
    const [b, c] = Array.from(first(container).children) as HTMLElement[]
    expect(b?.tagName).toBe('SPAN')
    expect(getComputedStyle(b as Element).color).toBe('rgb(255, 0, 0)')
    expect(getComputedStyle(b as Element).fontSize).toBe('20px')
    expect(getComputedStyle(b as Element).textDecorationLine).toBe('underline')
    expect(getComputedStyle(c as Element).fontSize).toBe('10px')
  })

  describe('numberOfLines', () => {
    test('one line truncates with an ellipsis', () => {
      const { container } = render(<Text numberOfLines={1}>Hello</Text>)
      const computed = getComputedStyle(first(container))
      expect(computed.whiteSpace).toBe('nowrap')
      expect(computed.overflow).toBe('hidden')
      expect(computed.textOverflow).toBe('ellipsis')
    })

    test('more lines clamp to that many lines', () => {
      const { container } = render(
        <View style={{ width: 60 }}>
          <Text numberOfLines={2} style={{ lineHeight: 20 }}>
            one two three four five six seven eight nine ten
          </Text>
        </View>,
      )
      const text = first(container).firstElementChild as HTMLElement
      const computed = getComputedStyle(text)
      expect(computed.webkitLineClamp).toBe('2')
      expect(computed.overflow).toBe('hidden')
      expect(text.clientHeight).toBe(40)
      expect(text.scrollHeight).toBeGreaterThan(40)
    })

    test('clip removes the ellipsis', () => {
      const { container } = render(
        <Text numberOfLines={1} ellipsizeMode="clip">
          Hello
        </Text>,
      )
      expect(getComputedStyle(first(container)).textOverflow).toBe('clip')
    })

    test('truncates a long line in a narrow parent', () => {
      const { container } = render(
        <View style={{ width: 40 }}>
          <Text numberOfLines={1}>A very long line of text that cannot fit</Text>
        </View>,
      )
      const text = first(container).firstElementChild as HTMLElement
      expect(text.scrollWidth).toBeGreaterThan(text.clientWidth)
    })
  })

  describe('selection', () => {
    test('is selectable by default', () => {
      const { container } = render(<Text>Hello</Text>)
      expect(getComputedStyle(first(container)).userSelect).toBe('auto')
    })

    test('selectable false disables selection', () => {
      const { container } = render(<Text selectable={false}>Hello</Text>)
      expect(getComputedStyle(first(container)).userSelect).toBe('none')
    })

    test('selectionColor adds a ::selection rule', () => {
      const { container } = render(<Text selectionColor="red">Hello</Text>)
      const className = Array.from(first(container).classList).find((c) => c.startsWith('rn-sel-'))
      expect(className).toBeDefined()
      const sheet = (document.getElementById(LONGHAND_STYLE_ID) as HTMLStyleElement).sheet
      const rules = Array.from(sheet?.cssRules ?? []).map((r) => r.cssText)
      expect(rules).toContain(`.${className}::selection { background-color: rgb(255, 0, 0); }`)
    })
  })

  describe('press', () => {
    test('onPress runs on click', () => {
      const onPress = vi.fn()
      const { container } = render(<Text onPress={onPress}>Hello</Text>)
      first(container).click()
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    test('disabled blocks onPress and sets aria-disabled', () => {
      const onPress = vi.fn()
      const { container } = render(
        <Text onPress={onPress} disabled>
          Hello
        </Text>,
      )
      first(container).click()
      expect(onPress).not.toHaveBeenCalled()
      expect(first(container).getAttribute('aria-disabled')).toBe('true')
    })

    test('onClick runs first and can cancel onPress', () => {
      const onPress = vi.fn()
      const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
      const { container } = render(
        <Text onPress={onPress} onClick={onClick}>
          Hello
        </Text>,
      )
      first(container).click()
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onPress).not.toHaveBeenCalled()
    })

    test('onPress never reaches the DOM as an attribute', () => {
      const { container } = render(<Text onPress={() => {}}>Hello</Text>)
      expect(first(container).hasAttribute('onpress')).toBe(false)
    })
  })

  describe('semantic tags', () => {
    test('href renders an anchor with its attributes', () => {
      const { container } = render(
        <Text href="/a" target="_blank" rel="noopener" lang="fr">
          Link
        </Text>,
      )
      const a = first(container) as HTMLAnchorElement
      expect(a.tagName).toBe('A')
      expect(a.getAttribute('href')).toBe('/a')
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toBe('noopener')
      expect(a.getAttribute('lang')).toBe('fr')
    })

    test('heading role renders a heading element', () => {
      const { container } = render(
        <Text role="heading" aria-level={3}>
          Title
        </Text>,
      )
      expect(first(container).tagName).toBe('H3')
      expect(first(container).hasAttribute('aria-level')).toBe(false)
    })

    test('a separator with text is a span with the role', () => {
      const { container } = render(<Text role="separator">·</Text>)
      expect(first(container).tagName).toBe('SPAN')
      expect(first(container).getAttribute('role')).toBe('separator')
    })
  })

  test('ref is the DOM element', () => {
    const ref = createRef<HTMLElement>()
    const { container } = render(<Text ref={ref}>Hello</Text>)
    expect(ref.current).toBe(first(container))
  })

  test('React Native props never reach the DOM', () => {
    const { container } = render(
      <Text numberOfLines={2} selectable ellipsizeMode="tail" testID="t">
        Hello
      </Text>,
    )
    const element = first(container)
    expect(element.getAttribute('data-testid')).toBe('t')
    for (const name of ['numberoflines', 'selectable', 'ellipsizemode']) {
      expect(element.hasAttribute(name)).toBe(false)
    }
  })
})
