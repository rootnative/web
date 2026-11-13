import { Component, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server.browser'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { StyleSheet } from '../../apis/StyleSheet'
import { createStyleRegistry, StyleRegistryProvider } from '../../server'
import { cleanup, render } from '../../test/render'
import { unstable_createElement } from './index'

afterEach(cleanup)

const SVG = 'http://www.w3.org/2000/svg'

describe('unstable_createElement', () => {
  test('passes unknown props to the element', () => {
    const { container } = render(
      <svg>{unstable_createElement('path', { d: 'M0 0L10 10', fill: 'red', strokeWidth: 2 })}</svg>,
    )
    const path = container.querySelector('path') as SVGPathElement
    expect(path.namespaceURI).toBe(SVG)
    expect(path.getAttribute('d')).toBe('M0 0L10 10')
    expect(path.getAttribute('fill')).toBe('red')
    expect(path.getAttribute('stroke-width')).toBe('2')
  })

  test('compiles a React Native style and keeps a class name', () => {
    const styles = StyleSheet.create({ box: { width: 40, opacity: 0.5 } })
    const { container } = render(
      unstable_createElement('div', { className: 'mine', style: [styles.box, { height: 20 }] }),
    )
    const element = container.firstElementChild as HTMLElement
    const computed = getComputedStyle(element)
    expect(element.classList.contains('mine')).toBe(true)
    expect(computed.width).toBe('40px')
    expect(computed.height).toBe('20px')
    expect(computed.opacity).toBe('0.5')
    expect(element.getAttribute('style')).toBeNull()
  })

  test('maps the accessibility props and drops the native-only props', () => {
    const { container } = render(
      unstable_createElement('div', {
        accessibilityLabel: 'Chart',
        testID: 'chart',
        nativeID: 'chart-1',
        focusable: true,
        onPress: () => {},
        onStartShouldSetResponder: () => true,
        onResponderRelease: () => {},
      }),
    )
    const element = container.firstElementChild as HTMLElement
    expect(element.getAttribute('aria-label')).toBe('Chart')
    expect(element.getAttribute('data-testid')).toBe('chart')
    expect(element.id).toBe('chart-1')
    expect(element.tabIndex).toBe(0)
    expect(new Set(element.getAttributeNames())).toEqual(
      new Set(['aria-label', 'data-testid', 'id', 'tabindex']),
    )
  })

  test('gives the ref the element, calls DOM handlers, and renders children', () => {
    const ref = vi.fn()
    const onClick = vi.fn()
    const { container } = render(unstable_createElement('button', { ref, onClick, children: 'Go' }))
    const button = container.firstElementChild as HTMLButtonElement
    expect(ref).toHaveBeenCalledWith(button)
    expect(button.textContent).toBe('Go')
    button.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('works from the render of a class component, with keys', () => {
    class Shapes extends Component {
      override render(): ReactElement {
        return <svg>{['a', 'b'].map((key) => unstable_createElement('circle', { key, r: 4 }))}</svg>
      }
    }
    const { container } = render(<Shapes />)
    expect(container.querySelectorAll('circle')).toHaveLength(2)
  })

  test('renders with no props', () => {
    const { container } = render(unstable_createElement('span'))
    expect((container.firstElementChild as HTMLElement).tagName).toBe('SPAN')
  })

  test('puts its rules in the registry of a server render', () => {
    const registry = createStyleRegistry()
    const html = renderToString(
      <StyleRegistryProvider registry={registry}>
        {unstable_createElement('div', { style: { width: 37 } })}
      </StyleRegistryProvider>,
    )
    expect(html).toContain('class="')
    expect(registry.cssText().longhand).toContain('{width:37px}')
  })
})
