import { act, type ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server.browser'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { Text } from '../components/Text'
import { View } from '../components/View'
import { MAX_VALUES_OF_PROPERTY, PRECEDENCE_ORDER, resetStyleRegistry } from '../style/registry'
import { renderAsServer } from '../utils/env'

// The tests make server HTML in the page with `renderAsServer`, as a server sends it, and
// hydrate it. The Node tests in `server.node.test.tsx` render with no DOM.

const groupRuleCounts = (): number[] =>
  PRECEDENCE_ORDER.map((precedence) =>
    Array.from(
      document.querySelectorAll<HTMLStyleElement>(`style[data-precedence="${precedence}"]`),
    )
      .map((element) => element.sheet?.cssRules.length ?? 0)
      .reduce((sum, count) => sum + count, 0),
  )

const serverPage = (app: ReactElement): HTMLElement => {
  const container = document.createElement('div')
  container.innerHTML = renderAsServer(() => renderToString(app))
  document.body.appendChild(container)
  return container
}

const byTestId = (container: HTMLElement, id: string): Element =>
  container.querySelector(`[data-testid="${id}"]`) as Element

function Box({ wide }: { wide: boolean }): ReactElement {
  return (
    <View testID="box" style={{ width: wide ? 20 : 10, padding: 4, paddingTop: 1 }}>
      <Text>Hello</Text>
    </View>
  )
}

describe('server render', () => {
  beforeEach(resetStyleRegistry)
  afterEach(resetStyleRegistry)

  test('the HTML starts with the style groups, and they apply before hydration', () => {
    const container = serverPage(<Box wide={false} />)

    expect(container.firstElementChild?.tagName).toBe('STYLE')
    const box = getComputedStyle(byTestId(container, 'box'))
    expect(box.width).toBe('10px')
    expect(box.paddingTop).toBe('1px')
    expect(box.paddingLeft).toBe('4px')
    container.remove()
  })

  test('on hydration, the client adopts the groups of the server and inserts no copy', async () => {
    const container = serverPage(<Box wide={false} />)
    const elements = document.querySelectorAll('style[data-precedence]').length
    const before = groupRuleCounts()

    let root: Root | undefined
    await act(async () => {
      root = hydrateRoot(container, <Box wide={false} />)
    })
    expect(document.querySelectorAll('style[data-precedence]')).toHaveLength(elements)
    expect(groupRuleCounts()).toEqual(before)

    // A new class goes into the longhand group of the server, after its shorthand group.
    await act(async () => root?.render(<Box wide />))
    const box = getComputedStyle(byTestId(container, 'box'))
    expect(box.width).toBe('20px')
    expect(box.paddingTop).toBe('1px')
    expect(document.querySelectorAll('style[data-precedence]')).toHaveLength(elements)

    act(() => root?.unmount())
    container.remove()
  })

  // React keeps the text of the server until the next render.
  test('suppressHydrationWarning lets a text differ from the server HTML', async () => {
    const container = serverPage(<Text suppressHydrationWarning>Server time</Text>)
    const errors: unknown[] = []

    let root: Root | undefined
    await act(async () => {
      root = hydrateRoot(container, <Text suppressHydrationWarning>Client time</Text>, {
        onRecoverableError: (error) => errors.push(error),
      })
    })
    expect(errors).toEqual([])
    expect(container.querySelector('span')?.textContent).toBe('Server time')

    await act(async () => root?.render(<Text suppressHydrationWarning>Later time</Text>))
    expect(container.querySelector('span')?.textContent).toBe('Later time')

    act(() => root?.unmount())
    container.remove()
  })

  // The server has no cap, and a rule from the server doesn't count in the browser. So both
  // give each element its classes, however many values a property has.
  test('a page with more values of a property than the cap hydrates with no inline style', async () => {
    const widths = Array.from({ length: MAX_VALUES_OF_PROPERTY + 12 }, (_, index) => index + 1)
    const page = (
      <View testID="many">
        {widths.map((width) => (
          <View key={width} style={{ width }} />
        ))}
      </View>
    )
    const container = serverPage(page)
    expect(container.innerHTML).not.toContain('style="')
    const errors: unknown[] = []

    let root: Root | undefined
    await act(async () => {
      root = hydrateRoot(container, page, { onRecoverableError: (error) => errors.push(error) })
    })

    expect(errors).toEqual([])
    const boxes = Array.from(byTestId(container, 'many').children) as HTMLElement[]
    expect(boxes).toHaveLength(widths.length)
    expect(boxes.filter((box) => box.getAttribute('style') !== null)).toEqual([])
    expect(getComputedStyle(boxes.at(-1) as HTMLElement).width).toBe(`${widths.at(-1)}px`)

    act(() => root?.unmount())
    container.remove()
  })

  // The HTML parser must keep the tree, or hydration does not match.
  test('the HTML parser keeps the markup of a table', () => {
    const html = renderAsServer(() =>
      renderToString(
        <View role="table">
          <Text>Caption</Text>
          <View role="row">
            <Text role="rowheader">width</Text>
            <Text role="cell">100</Text>
          </View>
        </View>,
      ),
    )
    // In a page, the markup and its style elements sit in the element that the client hydrates.
    const parsed = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html')
    expect(parsed.getElementById('root')?.innerHTML).toBe(html)
  })
})
