import { act, createRef } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { userEvent } from 'vitest/browser'

import { LONGHAND_STYLE_ID } from '../../style/registry'
import { cleanup, render } from '../../test/render'
import { Pressable } from '../Pressable'
import { View } from '../View'
import { Text } from './index'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const first = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement

const byTestId = (id: string): HTMLElement =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement

const touch = (element: Element, type: string): void => {
  const rect = element.getBoundingClientRect()
  act(() => {
    element.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: rect.left + 2,
        clientY: rect.top + 2,
      }),
    )
  })
}

const user = async (action: () => Promise<void>): Promise<void> => {
  await act(action)
}

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
    test('onPress runs on a click with no pointer press', () => {
      const onPress = vi.fn()
      const { container } = render(<Text onPress={onPress}>Hello</Text>)
      first(container).click()
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    test('a pointer press calls onPressIn, onPress, and onPressOut once', async () => {
      const onPressIn = vi.fn()
      const onPress = vi.fn()
      const onPressOut = vi.fn()
      render(
        <Text testID="t" onPressIn={onPressIn} onPress={onPress} onPressOut={onPressOut}>
          Hello
        </Text>,
      )
      await user(() => userEvent.click(byTestId('t')))
      await vi.waitFor(() => expect(onPressOut).toHaveBeenCalledTimes(1))
      expect(onPressIn).toHaveBeenCalledTimes(1)
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    test('onLongPress runs after 500 ms, and onPress then does not', () => {
      const onLongPress = vi.fn()
      const onPress = vi.fn()
      render(
        <Text testID="t" onLongPress={onLongPress} onPress={onPress}>
          Hello
        </Text>,
      )
      vi.useFakeTimers()
      touch(byTestId('t'), 'pointerdown')
      act(() => vi.advanceTimersByTime(499))
      expect(onLongPress).not.toHaveBeenCalled()
      act(() => vi.advanceTimersByTime(1))
      expect(onLongPress).toHaveBeenCalledTimes(1)
      touch(byTestId('t'), 'pointerup')
      expect(onPress).not.toHaveBeenCalled()
    })

    test('onPressIn alone does not make a Text pressable', async () => {
      const onPressIn = vi.fn()
      render(
        <Text testID="t" onPressIn={onPressIn}>
          Hello
        </Text>,
      )
      const element = byTestId('t')
      await user(() => userEvent.click(element))
      expect(onPressIn).not.toHaveBeenCalled()
      expect(element.hasAttribute('role')).toBe(false)
      expect(element.hasAttribute('tabindex')).toBe(false)
    })

    test('a pressable Text is a link that the keyboard can press', async () => {
      const onPress = vi.fn()
      render(
        <Text testID="t" onPress={onPress}>
          Hello
        </Text>,
      )
      const element = byTestId('t')
      expect(element.tagName).toBe('SPAN')
      expect(element.getAttribute('role')).toBe('link')
      expect(element.tabIndex).toBe(0)
      act(() => element.focus())
      await user(() => userEvent.keyboard('{Enter}'))
      expect(onPress).toHaveBeenCalledTimes(1)
    })

    test('a role or an href keeps its own element', () => {
      render(
        <>
          <Text testID="button" role="button" onPress={() => {}}>
            Save
          </Text>
          <Text testID="link" href="/a" onPress={() => {}}>
            About
          </Text>
        </>,
      )
      expect(byTestId('button').tagName).toBe('BUTTON')
      expect(byTestId('button').hasAttribute('role')).toBe(false)
      expect(byTestId('link').tagName).toBe('A')
      expect(byTestId('link').hasAttribute('tabindex')).toBe(false)
    })

    test('disabled: aria-disabled, no link role, and no press', async () => {
      const onPress = vi.fn()
      render(
        <Text testID="t" onPress={onPress} disabled>
          Hello
        </Text>,
      )
      const element = byTestId('t')
      await user(() => userEvent.click(element))
      expect(onPress).not.toHaveBeenCalled()
      expect(element.getAttribute('aria-disabled')).toBe('true')
      expect(element.hasAttribute('role')).toBe(false)
      expect(element.hasAttribute('tabindex')).toBe(false)
    })

    test('a disabled Text leaves the press to its parent', async () => {
      const parent = vi.fn()
      const child = vi.fn()
      render(
        <Pressable onPress={parent}>
          <Text testID="t" onPress={child} disabled>
            Hello
          </Text>
        </Pressable>,
      )
      await user(() => userEvent.click(byTestId('t')))
      expect(child).not.toHaveBeenCalled()
      expect(parent).toHaveBeenCalledTimes(1)
    })

    test('the innermost pressable Text takes the press', async () => {
      const outer = vi.fn()
      const inner = vi.fn()
      render(
        <Text onPress={outer}>
          Read the{' '}
          <Text testID="inner" onPress={inner}>
            terms
          </Text>
        </Text>,
      )
      await user(() => userEvent.click(byTestId('inner')))
      expect(inner).toHaveBeenCalledTimes(1)
      expect(outer).not.toHaveBeenCalled()
    })

    test('onClick and onPress both run, onClick first', async () => {
      const calls: string[] = []
      render(
        <Text testID="t" onClick={() => calls.push('click')} onPress={() => calls.push('press')}>
          Hello
        </Text>,
      )
      act(() => byTestId('t').click())
      expect(calls).toEqual(['click', 'press'])
    })

    test('onFocus and onBlur reach the app, pressable or not', () => {
      const onFocus = vi.fn()
      const onBlur = vi.fn()
      render(
        <>
          <Text testID="pressable" onPress={() => {}} onFocus={onFocus} onBlur={onBlur}>
            A
          </Text>
          <Text testID="plain" tabIndex={0} onFocus={onFocus} onBlur={onBlur}>
            B
          </Text>
        </>,
      )
      for (const id of ['pressable', 'plain']) {
        act(() => byTestId(id).focus())
        act(() => byTestId(id).blur())
      }
      expect(onFocus).toHaveBeenCalledTimes(2)
      expect(onBlur).toHaveBeenCalledTimes(2)
    })

    test('press props never reach the DOM as attributes', () => {
      const { container } = render(
        <Text onPress={() => {}} pressRetentionOffset={10} suppressHighlighting>
          Hello
        </Text>,
      )
      const element = first(container)
      for (const name of ['onpress', 'pressretentionoffset', 'suppresshighlighting']) {
        expect(element.hasAttribute(name)).toBe(false)
      }
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

    test('a button role renders a button that does not submit a form', () => {
      const { container } = render(<Text role="button">Go</Text>)
      expect((first(container) as HTMLButtonElement).type).toBe('button')
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
