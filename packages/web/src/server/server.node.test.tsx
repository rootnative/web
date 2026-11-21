import { renderToString } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { unstable_createElement } from '../compat/createElement'
import { ActivityIndicator } from '../components/ActivityIndicator'
import { Image } from '../components/Image'
import { Pressable } from '../components/Pressable'
import { RefreshControl } from '../components/RefreshControl'
import { ScrollView } from '../components/ScrollView'
import { Switch } from '../components/Switch'
import { Text } from '../components/Text'
import { TextInput } from '../components/TextInput'
import { View } from '../components/View'
import {
  getStyleRegistry,
  MAX_SERVER_CLASSES,
  PRECEDENCE_ORDER,
  resetStyleRegistry,
} from '../style/registry'

// A server render with React's own server renderer and no DOM.

type StyleElement = { precedence: string; css: string }

const styleElements = (html: string): StyleElement[] =>
  Array.from(
    html.matchAll(/<style data-precedence="([^"]+)" data-href="[^"]*">([^<]*)<\/style>/g),
    (match) => ({ precedence: match[1] ?? '', css: match[2] ?? '' }),
  )

const classNamesOf = (html: string): string[] => [
  ...new Set(
    Array.from(html.matchAll(/class="([^"]*)"/g)).flatMap((match) => (match[1] ?? '').split(' ')),
  ),
]

describe('server render', () => {
  test('a full document gets the three groups in <head>, in order, and none in <body>', () => {
    const html = renderToString(
      <html lang="en">
        <head>
          <title>Page</title>
        </head>
        <body>
          <View style={{ width: 10, padding: 4 }}>
            <Text>Hello</Text>
          </View>
        </body>
      </html>,
    )
    const end = html.indexOf('</head>')
    expect(styleElements(html.slice(0, end)).map((element) => element.precedence)).toEqual([
      ...PRECEDENCE_ORDER,
    ])
    expect(html.slice(end)).not.toContain('<style')
  })

  test('a fragment gets the groups at its start', () => {
    const html = renderToString(<View style={{ padding: 0, paddingTop: 10 }} />)
    expect(html).toMatch(/^<style data-precedence="rootnative-reset"/)
    expect(html).toMatch(/<\/style><div class="/)
  })

  // React orders its groups by the first time it meets each one.
  test('a first component with only a longhand still gives the groups in order', () => {
    const html = renderToString(
      <>
        {unstable_createElement('svg', { style: { width: 10 } })}
        <View style={{ padding: 2 }} />
      </>,
    )
    expect(styleElements(html).map((element) => element.precedence)).toEqual([...PRECEDENCE_ORDER])
  })

  test('each class in the markup of each component has its CSS in a style element', () => {
    const html = renderToString(
      <View>
        <Text selectionColor="red" numberOfLines={2}>
          Hello
        </Text>
        <TextInput placeholder="Name" placeholderTextColor="gray" selectionColor="blue" />
        <TextInput multiline />
        <Image source={{ uri: 'https://example.com/a.png', width: 10, height: 10 }} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} />}
        >
          <Text>Item</Text>
        </ScrollView>
        <Pressable hitSlop={8}>
          <Text>Press</Text>
        </Pressable>
        <ActivityIndicator />
        <Switch value />
        {unstable_createElement('svg', { style: { height: 4 } })}
      </View>,
    )
    const css = styleElements(html)
      .map((element) => element.css)
      .join('')
    expect(classNamesOf(html).filter((name) => !css.includes(`.${name}`))).toEqual([])
  })

  test('a closing tag in a value does not end the style element', () => {
    const html = renderToString(<Text style={{ fontFamily: '"</style><script>"' }}>Hello</Text>)
    expect(html).not.toContain('</style><script>')
  })

  test('the server registry serves each render, and starts again past its limit', () => {
    resetStyleRegistry()
    const first = getStyleRegistry()
    renderToString(<View style={{ width: 1 }} />)
    expect(getStyleRegistry()).toBe(first)

    for (let i = 0; i <= MAX_SERVER_CLASSES; i++) first.classFor('width', `${i}px`)
    expect(getStyleRegistry()).not.toBe(first)
    resetStyleRegistry()
  })
})
