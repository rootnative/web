import { View } from '@rootnative/web'
import { createElement } from 'react'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { AppRegistry } from '../src/AppRegistry.js'
import { resetRules } from '../src/createSheet.js'

const Padded = () => createElement(View, { style: { paddingTop: 7 } })
const Empty = () => null

describe('getApplication', () => {
  test('the element renders its CSS in the three style groups, in order', () => {
    AppRegistry.registerComponent('Padded', () => Padded)
    const html = renderToString(AppRegistry.getApplication('Padded').element)

    const groups = html.match(/<style data-precedence="rootnative-[a-z]+"/g) ?? []
    expect(groups.map((tag) => tag.slice(35, -1))).toEqual(['reset', 'shorthand', 'longhand'])
    expect(html).toContain('padding-top:7px')
    const classNames = html.match(/<div [^>]*class="([^"]*)"/)?.[1].split(' ') ?? []
    expect(classNames.length).toBeGreaterThan(0)
    for (const name of classNames) expect(html).toContain(`.${name}`)
  })

  test('keeps the CSS of one render out of the next', () => {
    AppRegistry.registerComponent('Padded', () => Padded)
    AppRegistry.registerComponent('Empty', () => Empty)
    renderToString(AppRegistry.getApplication('Padded').element)

    expect(renderToString(AppRegistry.getApplication('Empty').element)).not.toContain(
      'padding-top:7px',
    )
  })

  test('gives the reset sheet as the style element, with the id that createSheet reads', () => {
    AppRegistry.registerComponent('Padded', () => Padded)
    const { getStyleElement } = AppRegistry.getApplication('Padded')

    const html = renderToStaticMarkup(
      createElement('head', null, getStyleElement({ key: 'react-native-style', nonce: 'abc' })),
    )
    expect(html).toBe(
      `<head><style nonce="abc" id="react-native-stylesheet">${resetRules.join('\n')}</style></head>`,
    )
    expect(html).toContain('body{margin:0;}')
  })

  test('the style element needs no props', () => {
    AppRegistry.registerComponent('Padded', () => Padded)
    const { getStyleElement } = AppRegistry.getApplication('Padded')

    expect(renderToStaticMarkup(getStyleElement())).toContain('id="react-native-stylesheet"')
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
