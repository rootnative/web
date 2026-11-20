import { View } from '@rootnative/web'
import { createElement } from 'react'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { AppRegistry } from '../src/AppRegistry.js'

const Padded = () => createElement(View, { style: { paddingTop: 7 } })
const Empty = () => null

describe('getApplication', () => {
  test('gives the three style groups with the CSS of the render', () => {
    AppRegistry.registerComponent('Padded', () => Padded)
    const { element, getStyleElement } = AppRegistry.getApplication('Padded')
    const html = renderToString(element)
    const css = renderToStaticMarkup(getStyleElement())

    expect(
      css.match(/<style data-precedence="rootnative-(reset|shorthand|longhand)"/g),
    ).toHaveLength(3)
    expect(css).toContain('padding-top:7px')
    const classNames = html.match(/class="([^"]*)"/)?.[1].split(' ') ?? []
    expect(classNames.some((name) => css.includes(`.${name}`))).toBe(true)
  })

  test('keeps the CSS of one render out of the next', () => {
    AppRegistry.registerComponent('Padded', () => Padded)
    AppRegistry.registerComponent('Empty', () => Empty)
    const padded = AppRegistry.getApplication('Padded')
    const empty = AppRegistry.getApplication('Empty')
    renderToString(padded.element)
    renderToString(empty.element)

    expect(renderToStaticMarkup(empty.getStyleElement())).not.toContain('padding-top:7px')
  })

  test('puts the key of getStyleElement on the fragment, so its three groups stay', () => {
    AppRegistry.registerComponent('Padded', () => Padded)
    const { element, getStyleElement } = AppRegistry.getApplication('Padded')
    renderToString(element)

    const tags = getStyleElement({ key: 'react-native-style' })
    expect(tags.key).toBe('react-native-style')
    expect(
      renderToStaticMarkup(tags).match(/<style data-precedence="rootnative-[a-z]+"/g),
    ).toHaveLength(3)
  })

  test('passes the initial props to the component', () => {
    AppRegistry.registerComponent('Named', () => (props) => createElement('p', null, props.name))
    const { element } = AppRegistry.getApplication('Named', { initialProps: { name: 'Ada' } })

    expect(renderToString(element)).toContain('<p>Ada</p>')
  })

  test('throws for a key that is not registered', () => {
    expect(() => AppRegistry.getApplication('Nothing')).toThrow('has not been registered')
  })
})
