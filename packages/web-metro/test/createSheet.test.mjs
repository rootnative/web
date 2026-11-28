import { afterEach, describe, expect, test } from 'vitest'

import { createSheet, resetRules } from '../src/createSheet.js'

// A document with only what `createSheet` uses. `check:expo` checks the real one in Chromium.
const fakeParent = () => ({
  children: [],
  get firstChild() {
    return this.children[0] ?? null
  },
  insertBefore(element, before) {
    const at = before === null ? this.children.length : this.children.indexOf(before)
    this.children.splice(at, 0, element)
  },
  getElementById(id) {
    return this.children.find((child) => child.id === id) ?? null
  },
})

const fakeDocument = () => {
  const head = fakeParent()
  head.children.push({ id: 'expo-reset', textContent: 'body{overflow:hidden}' })
  return {
    head,
    getElementById: (id) => head.getElementById(id),
    createElement: () => ({
      id: '',
      textContent: '',
      append(text) {
        this.textContent += text
      },
    }),
  }
}

afterEach(() => {
  delete globalThis.document
})

describe('createSheet', () => {
  test('resets the margin of body, as react-native-web does', () => {
    expect(resetRules).toContain('body{margin:0;}')
    expect(resetRules).toHaveLength(4)
  })

  test('with no DOM, gives the rules as text', () => {
    const sheet = createSheet(undefined)
    expect(sheet.id).toBe('react-native-stylesheet')
    expect(sheet.getTextContent()).toBe(resetRules.join('\n'))
    sheet.insert('.a{color:red}')
    expect(sheet.getTextContent()).toContain('.a{color:red}')
  })

  test('puts one style element first in head, so the sheets after it win', () => {
    globalThis.document = fakeDocument()
    const sheet = createSheet(undefined)
    const [first, second] = document.head.children
    expect(first.id).toBe('react-native-stylesheet')
    expect(first.textContent).toBe(resetRules.join('\n'))
    expect(second.id).toBe('expo-reset')
    expect(sheet.getTextContent()).toBe(first.textContent)
  })

  test('uses the element that is there on a second call', () => {
    globalThis.document = fakeDocument()
    createSheet(undefined)
    createSheet(undefined).insert('.a{color:red}')
    expect(document.head.children).toHaveLength(2)
    expect(document.head.children[0].textContent).toContain('.a{color:red}')
  })

  test('puts the sheet in the shadow root of the root element', () => {
    globalThis.document = fakeDocument()
    const shadowRoot = fakeParent()
    createSheet({ getRootNode: () => shadowRoot })
    expect(shadowRoot.children.map((child) => child.id)).toEqual(['react-native-stylesheet'])
    expect(document.head.children).toHaveLength(1)
  })
})
