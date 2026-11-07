import { createRef } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { StyleSheet } from '../../apis/StyleSheet'
import { cleanup, render } from '../../test/render'
import { View } from './index'

afterEach(cleanup)

const first = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement

describe('View', () => {
  test('renders a div with the native reset', () => {
    const { container } = render(<View />)
    const element = first(container)
    expect(element.tagName).toBe('DIV')
    const computed = getComputedStyle(element)
    expect(computed.display).toBe('flex')
    expect(computed.flexDirection).toBe('column')
    expect(computed.alignItems).toBe('stretch')
    expect(computed.boxSizing).toBe('border-box')
    expect(computed.position).toBe('relative')
    expect(computed.flexShrink).toBe('0')
    expect(computed.minWidth).toBe('0px')
  })

  test('applies style over the reset', () => {
    const styles = StyleSheet.create({
      row: { flexDirection: 'row', padding: 4, display: 'contents' },
    })
    const { container } = render(<View style={styles.row} />)
    const computed = getComputedStyle(first(container))
    expect(computed.display).toBe('contents')
    expect(computed.flexDirection).toBe('row')
    expect(computed.paddingLeft).toBe('4px')
  })

  test('a longhand in style wins over a shorthand in the reset', () => {
    const { container } = render(<View style={{ marginLeft: 8 }} />)
    expect(getComputedStyle(first(container)).marginLeft).toBe('8px')
  })

  test('accepts an array style', () => {
    const { container } = render(<View style={[{ width: 10 }, false, { width: 20 }]} />)
    expect(getComputedStyle(first(container)).width).toBe('20px')
  })

  test('renders children', () => {
    const { container } = render(
      <View>
        <View testID="child" />
      </View>,
    )
    expect(first(container).querySelector('[data-testid="child"]')).not.toBeNull()
  })

  describe('ref', () => {
    test('is the DOM element', () => {
      const ref = createRef<HTMLElement>()
      const { container } = render(<View ref={ref} />)
      expect(ref.current).toBe(first(container))
    })

    test('accepts a callback', () => {
      const ref = vi.fn()
      render(<View ref={ref} />)
      expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement))
    })
  })

  describe('semantic tags', () => {
    test('role picks the element', () => {
      const { container } = render(
        <View role="main">
          <View role="navigation" />
          <View role="list">
            <View role="listitem" />
          </View>
          <View role="heading" aria-level={1} />
          <View role="img" />
        </View>,
      )
      expect(container.innerHTML).toMatch(
        /^<main class="[^"]*"><nav class="[^"]*"><\/nav><ul class="[^"]*"><li class="[^"]*"><\/li><\/ul><h1 class="[^"]*"><\/h1><div role="img" class="[^"]*"><\/div><\/main>$/,
      )
    })

    test('table roles render divs with role attributes', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { container } = render(
        <View role="table">
          <View role="row">
            <View role="cell" />
          </View>
        </View>,
      )
      expect(container.innerHTML).toMatch(
        /^<div role="table" class="[^"]*"><div role="row" class="[^"]*"><div role="cell" class="[^"]*"><\/div><\/div><\/div>$/,
      )
      const nesting = error.mock.calls
        .map((call) => String(call[0]))
        .filter((message) => /cannot (be a child of|contain a nested)/.test(message))
      expect(nesting).toEqual([])
      error.mockRestore()
    })

    test('a separator is an <hr>, or a div with the role when it has children', () => {
      const { container } = render(
        <View>
          <View role="separator" />
          <View role="separator">{false}</View>
          <View role="separator">
            <View />
          </View>
        </View>,
      )
      const [empty, falsy, parent] = Array.from(first(container).children)
      expect(empty?.tagName).toBe('HR')
      expect(falsy?.tagName).toBe('DIV')
      expect(parent?.tagName).toBe('DIV')
      expect(parent?.getAttribute('role')).toBe('separator')
    })

    test('a button role renders a button that does not submit a form', () => {
      const { container } = render(<View role="button" />)
      expect((first(container) as HTMLButtonElement).type).toBe('button')
    })

    test('href renders an anchor', () => {
      const { container } = render(<View href="/a" role="link" />)
      const a = first(container) as HTMLAnchorElement
      expect(a.tagName).toBe('A')
      expect(a.getAttribute('href')).toBe('/a')
      expect(a.hasAttribute('role')).toBe(false)
    })
  })

  describe('props to attributes', () => {
    test('maps accessibility props', () => {
      const { container } = render(
        <View
          accessibilityLabel="Label"
          accessibilityHint="Hint"
          accessibilityLabelledBy={['a', 'b']}
          accessibilityLiveRegion="polite"
          accessibilityState={{ disabled: true, selected: false, checked: 'mixed' }}
          accessibilityValue={{ min: 0, max: 10, now: 5, text: 'five' }}
          accessibilityElementsHidden
          nativeID="native"
          testID="test"
        />,
      )
      const element = first(container)
      expect(element.getAttribute('aria-label')).toBe('Label')
      expect(element.getAttribute('aria-description')).toBe('Hint')
      expect(element.getAttribute('aria-labelledby')).toBe('a b')
      expect(element.getAttribute('aria-live')).toBe('polite')
      expect(element.getAttribute('aria-disabled')).toBe('true')
      expect(element.getAttribute('aria-selected')).toBe('false')
      expect(element.getAttribute('aria-checked')).toBe('mixed')
      expect(element.getAttribute('aria-valuemin')).toBe('0')
      expect(element.getAttribute('aria-valuemax')).toBe('10')
      expect(element.getAttribute('aria-valuenow')).toBe('5')
      expect(element.getAttribute('aria-valuetext')).toBe('five')
      expect(element.getAttribute('aria-hidden')).toBe('true')
      expect(element.id).toBe('native')
      expect(element.getAttribute('data-testid')).toBe('test')
    })

    test('aria props win over the legacy accessibility props', () => {
      const { container } = render(
        <View aria-label="Aria" accessibilityLabel="Legacy" id="id" nativeID="native" />,
      )
      expect(first(container).getAttribute('aria-label')).toBe('Aria')
      expect(first(container).id).toBe('id')
    })

    test('focusable and tabIndex', () => {
      const { container } = render(
        <View>
          <View focusable />
          <View focusable={false} />
          <View tabIndex={-1} focusable />
          <View />
        </View>,
      )
      const [a, b, c, d] = Array.from(first(container).children)
      expect(a?.getAttribute('tabindex')).toBe('0')
      expect(b?.getAttribute('tabindex')).toBe('-1')
      expect(c?.getAttribute('tabindex')).toBe('-1')
      expect(d?.hasAttribute('tabindex')).toBe(false)
    })

    test('unknown React Native props never reach the DOM', () => {
      const { container } = render(<View collapsable={false} accessible />)
      const element = first(container)
      expect(element.hasAttribute('collapsable')).toBe(false)
      expect(element.hasAttribute('accessible')).toBe(false)
    })

    test('DOM handlers pass through', () => {
      const onClick = vi.fn()
      const onPointerDown = vi.fn()
      const { container } = render(<View onClick={onClick} onPointerDown={onPointerDown} />)
      first(container).dispatchEvent(new MouseEvent('click', { bubbles: true }))
      first(container).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onPointerDown).toHaveBeenCalledTimes(1)
    })
  })

  describe('pointerEvents', () => {
    test('none and auto set the CSS property', () => {
      const { container } = render(
        <View>
          <View pointerEvents="none" />
          <View pointerEvents="auto" />
        </View>,
      )
      const [a, b] = Array.from(first(container).children)
      expect(getComputedStyle(a as Element).pointerEvents).toBe('none')
      expect(getComputedStyle(b as Element).pointerEvents).toBe('auto')
    })

    test('box-none and box-only apply to the element and its children', () => {
      const { container } = render(
        <View>
          <View pointerEvents="box-none">
            <View />
          </View>
          <View pointerEvents="box-only">
            <View />
          </View>
        </View>,
      )
      const [boxNone, boxOnly] = Array.from(first(container).children)
      expect(getComputedStyle(boxNone as Element).pointerEvents).toBe('none')
      expect(getComputedStyle(boxNone?.firstElementChild as Element).pointerEvents).toBe('auto')
      expect(getComputedStyle(boxOnly as Element).pointerEvents).toBe('auto')
      expect(getComputedStyle(boxOnly?.firstElementChild as Element).pointerEvents).toBe('none')
    })
  })

  describe('onLayout', () => {
    test('fires after mount with the layout, and again after a resize', async () => {
      const onLayout = vi.fn()
      const { rerender } = render(
        <View style={{ padding: 10 }}>
          <View onLayout={onLayout} style={{ width: 50, height: 20 }} />
        </View>,
      )
      await vi.waitFor(() => expect(onLayout).toHaveBeenCalledTimes(1))
      expect(onLayout.mock.calls[0]?.[0]).toEqual({
        nativeEvent: { layout: { x: 10, y: 10, width: 50, height: 20 } },
      })

      rerender(
        <View style={{ padding: 10 }}>
          <View onLayout={onLayout} style={{ width: 70, height: 20 }} />
        </View>,
      )
      await vi.waitFor(() => expect(onLayout).toHaveBeenCalledTimes(2))
      expect(onLayout.mock.calls[1]?.[0].nativeEvent.layout.width).toBe(70)
    })
  })
})
