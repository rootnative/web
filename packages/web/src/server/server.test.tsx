import { renderToString } from 'react-dom/server.browser'
import { describe, expect, test } from 'vitest'

import { Text } from '../components/Text'
import { View } from '../components/View'
import { LONGHAND_STYLE_ID, SHORTHAND_STYLE_ID } from '../style/registry'
import { createStyleRegistry, renderStyleTags, StyleRegistryProvider, styleTagsHTML } from './index'

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

  test('renders the two style tags the client adopts', () => {
    const registry = createStyleRegistry()
    page(registry)

    const asString = styleTagsHTML(registry)
    expect(asString).toMatch(
      new RegExp(
        `^<style id="${SHORTHAND_STYLE_ID}">[^<]+</style><style id="${LONGHAND_STYLE_ID}">[^<]+</style>$`,
      ),
    )
    expect(renderToString(renderStyleTags(registry))).toBe(asString)
  })

  test('escapes a closing tag inside CSS', () => {
    const registry = createStyleRegistry()
    registry.classFor('fontFamily', '"</style><script>"')
    expect(styleTagsHTML(registry)).not.toContain('</style><script>')
  })

  test('every class name in the markup has a rule', () => {
    const registry = createStyleRegistry()
    const html = page(registry)
    const css = `${registry.cssText().shorthand}\n${registry.cssText().longhand}`
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
