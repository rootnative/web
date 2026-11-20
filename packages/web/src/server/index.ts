import { createElement, Fragment, type ReactElement, type ReactNode } from 'react'

import { StyleRegistry } from '../style/registry'

export { StyleRegistry } from '../style/registry'

/**
 * @deprecated A server render needs no registry now: each component renders its CSS as React 19
 * `<style href precedence>` elements, and React puts them in `<head>`. This function returns a
 * registry that nothing reads, and it goes away before 1.0.
 */
export const createStyleRegistry = (): StyleRegistry => new StyleRegistry()

/**
 * @deprecated A server render needs no provider now. It renders its children only, and it goes
 * away before 1.0.
 */
export function StyleRegistryProvider(props: {
  registry: StyleRegistry
  children?: ReactNode
}): ReactElement {
  return createElement(Fragment, null, props.children)
}

/**
 * @deprecated React puts the style elements of a server render in `<head>` by itself. This
 * function renders nothing, and it goes away before 1.0.
 */
export const renderStyleTags = (_registry: StyleRegistry): ReactElement => createElement(Fragment)

/**
 * @deprecated React puts the style elements of a server render in `<head>` by itself. This
 * function returns an empty string, and it goes away before 1.0.
 */
export const styleTagsHTML = (_registry: StyleRegistry): string => ''
