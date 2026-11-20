import { act } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server.browser'
import { describe, expect, test } from 'vitest'

import { Text } from '../components/Text'
import { View } from '../components/View'
import { PRECEDENCE_ORDER, resetStyleRegistry } from '../style/registry'
import { createStyleRegistry, renderStyleTags, StyleRegistryProvider, styleTagsHTML } from './index'

const groupRuleCounts = (): number[] =>
  PRECEDENCE_ORDER.map((precedence) =>
    Array.from(
      document.querySelectorAll<HTMLStyleElement>(`style[data-precedence="${precedence}"]`),
    )
      .map((element) => element.sheet?.cssRules.length ?? 0)
      .reduce((sum, count) => sum + count, 0),
  )

const groupPattern = (precedence: string): string =>
  `<style data-precedence="${precedence}" data-href="${precedence}">[^<]+</style>`

const page = (registry: ReturnType<typeof createStyleRegistry>): string =>
  renderToString(
    <StyleRegistryProvider registry={registry}>
      <View style={{ width: 10, padding: 4 }}>
        <Text selectionColor="red">Hello</Text>
      </View>
    </StyleRegistryProvider>,
  )

describe('server', () => {
  test('renders markup with class names and collects the CSS in the given registry', () => {
    const registry = createStyleRegistry()
    const html = page(registry)

    expect(html).toMatch(/^<div class="rn-[^"]+"><span class="rn-[^"]+">Hello<\/span><\/div>$/)
    const { shorthand, longhand } = registry.cssText()
    expect(shorthand).toContain('{padding:4px}')
    expect(longhand).toContain('{width:10px}')
    expect(longhand).toContain('::selection{background-color:rgb(255,0,0)}')
  })

  test('two registries do not share rules', () => {
    const a = createStyleRegistry()
    const b = createStyleRegistry()
    page(a)
    expect(a.ruleCount).toBeGreaterThan(0)
    expect(b.ruleCount).toBe(0)
  })

  test('renders the three groups as React writes them', () => {
    const registry = createStyleRegistry()
    page(registry)

    const asString = styleTagsHTML(registry)
    expect(asString).toMatch(new RegExp(`^${PRECEDENCE_ORDER.map(groupPattern).join('')}$`))
    expect(renderToString(renderStyleTags(registry))).toBe(asString)
  })

  test('React puts the groups in the <head> of a full document, in order', () => {
    const registry = createStyleRegistry()
    page(registry)
    const html = renderToString(
      <html lang="en">
        <head>
          <title>Page</title>
        </head>
        <body>{renderStyleTags(registry)}</body>
      </html>,
    )

    const head = html.slice(0, html.indexOf('</head>'))
    const [reset, shorthand, longhand] = PRECEDENCE_ORDER.map((precedence) =>
      head.indexOf(`data-precedence="${precedence}"`),
    ) as [number, number, number]
    expect(reset).toBeGreaterThanOrEqual(0)
    expect(shorthand).toBeGreaterThan(reset)
    expect(longhand).toBeGreaterThan(shorthand)
  })

  test('on hydration, the client adopts the groups of the server and inserts no copy', async () => {
    resetStyleRegistry()
    const app = (
      <View testID="box" style={{ width: 10, padding: 4 }}>
        <Text>Hello</Text>
      </View>
    )
    const registry = createStyleRegistry()
    const html = renderToString(
      <StyleRegistryProvider registry={registry}>{app}</StyleRegistryProvider>,
    )
    document.head.insertAdjacentHTML('beforeend', styleTagsHTML(registry))
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const before = groupRuleCounts()

    let root: Root | undefined
    await act(async () => {
      root = hydrateRoot(container, app)
    })

    expect(document.querySelectorAll('style[data-precedence]')).toHaveLength(3)
    expect(groupRuleCounts()).toEqual(before)
    expect(getComputedStyle(container.firstElementChild as Element).width).toBe('10px')
    act(() => root?.unmount())
    container.remove()
    resetStyleRegistry()
  })

  test('escapes a closing tag inside CSS', () => {
    const registry = createStyleRegistry()
    registry.classFor('fontFamily', '"</style><script>"')
    expect(styleTagsHTML(registry)).not.toContain('</style><script>')
  })

  test('every class name in the markup has a rule', () => {
    const registry = createStyleRegistry()
    const html = page(registry)
    const css = Object.values(registry.cssText()).join('\n')
    for (const className of html.match(/rn-[a-z0-9-]+/g) ?? []) {
      expect(css).toContain(`.${className}`)
    }
  })

  // The HTML parser must keep the tree, or hydration does not match.
  test('the HTML parser keeps the markup of a table', () => {
    const html = renderToString(
      <StyleRegistryProvider registry={createStyleRegistry()}>
        <View role="table">
          <Text>Caption</Text>
          <View role="row">
            <Text role="rowheader">width</Text>
            <Text role="cell">100</Text>
          </View>
        </View>
      </StyleRegistryProvider>,
    )
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    expect(parsed.body.innerHTML).toBe(html)
  })
})
