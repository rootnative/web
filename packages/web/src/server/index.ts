import { createElement, Fragment, type ReactElement, type ReactNode } from 'react'

import {
  LONGHAND_PRECEDENCE,
  RESET_PRECEDENCE,
  SHORTHAND_PRECEDENCE,
  StyleRegistry,
} from '../style/registry'
import { StyleRegistryContext } from '../style/StyleRegistryContext'

export { StyleRegistry } from '../style/registry'

// One registry per request, so concurrent renders never share CSS.
export const createStyleRegistry = (): StyleRegistry => new StyleRegistry()

export function StyleRegistryProvider(props: {
  registry: StyleRegistry
  children?: ReactNode
}): ReactElement {
  return createElement(StyleRegistryContext.Provider, { value: props.registry }, props.children)
}

const groups = [
  ['reset', RESET_PRECEDENCE],
  ['shorthand', SHORTHAND_PRECEDENCE],
  ['longhand', LONGHAND_PRECEDENCE],
] as const

// A closing tag inside CSS text would end the style element early.
const escapeCSS = (css: string): string => css.replace(/<\//g, '<\\/')

// The three groups of the render, as React 19 `<style href precedence>` elements, one for each
// group, in this order. React puts them in <head>, and on the client the registry writes into
// them. React doesn't hydrate them, so the client tree doesn't need them.
export const renderStyleTags = (registry: StyleRegistry): ReactElement => {
  const css = registry.cssText()
  return createElement(
    Fragment,
    null,
    ...groups.map(([level, precedence]) =>
      createElement('style', { key: precedence, href: precedence, precedence }, css[level]),
    ),
  )
}

// The same three elements as an HTML string, for a template: the markup that React writes for
// them.
export const styleTagsHTML = (registry: StyleRegistry): string => {
  const css = registry.cssText()
  return groups
    .map(
      ([level, precedence]) =>
        `<style data-precedence="${precedence}" data-href="${precedence}">${escapeCSS(css[level])}</style>`,
    )
    .join('')
}
