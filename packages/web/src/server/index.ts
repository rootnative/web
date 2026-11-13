import { createElement, Fragment, type ReactElement, type ReactNode } from 'react'

import {
  LONGHAND_STYLE_ID,
  RESET_STYLE_ID,
  SHORTHAND_STYLE_ID,
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

// A closing tag inside CSS text would end the style element early.
const escapeCSS = (css: string): string => css.replace(/<\//g, '<\\/')

// The three style elements the client adopts on hydration. Render them in <head>, in this order.
export const renderStyleTags = (registry: StyleRegistry): ReactElement => {
  const { reset, shorthand, longhand } = registry.cssText()
  return createElement(
    Fragment,
    null,
    createElement('style', {
      id: RESET_STYLE_ID,
      dangerouslySetInnerHTML: { __html: escapeCSS(reset) },
    }),
    createElement('style', {
      id: SHORTHAND_STYLE_ID,
      dangerouslySetInnerHTML: { __html: escapeCSS(shorthand) },
    }),
    createElement('style', {
      id: LONGHAND_STYLE_ID,
      dangerouslySetInnerHTML: { __html: escapeCSS(longhand) },
    }),
  )
}

// The same three elements as an HTML string, for a template.
export const styleTagsHTML = (registry: StyleRegistry): string => {
  const { reset, shorthand, longhand } = registry.cssText()
  return (
    `<style id="${RESET_STYLE_ID}">${escapeCSS(reset)}</style>` +
    `<style id="${SHORTHAND_STYLE_ID}">${escapeCSS(shorthand)}</style>` +
    `<style id="${LONGHAND_STYLE_ID}">${escapeCSS(longhand)}</style>`
  )
}
