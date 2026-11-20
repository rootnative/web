import { createElement, Fragment, type ReactElement } from 'react'

import { PRECEDENCE_ORDER, type StyleLevel, type StyleRegistry } from '../style/registry'
import { isServerRender } from '../utils/env'

const anchors = PRECEDENCE_ORDER.map((precedence) =>
  createElement(
    'style',
    { key: `${precedence}-order`, href: `${precedence}-order`, precedence },
    '',
  ),
)

// The style elements of each class list, for each registry.
const cache = new WeakMap<StyleRegistry, Map<string, readonly ReactElement[]>>()

// One `<style href precedence>` element for each class, in the order reset, shorthand, longhand.
// React orders its groups by the first time it meets each one, so an empty anchor stands in for
// each group below the highest that the classes use. The first component of a page then always
// gives React the three groups in this order. React keeps one copy for each href.
const styleElementsOf = (registry: StyleRegistry, classNames: string): readonly ReactElement[] => {
  let byClassNames = cache.get(registry)
  if (byClassNames === undefined) {
    byClassNames = new Map()
    cache.set(registry, byClassNames)
  }
  let elements = byClassNames.get(classNames)
  if (elements !== undefined) return elements

  const levels: [ReactElement[], ReactElement[], ReactElement[]] = [[], [], []]
  let highest = -1
  for (const name of new Set(classNames.split(' '))) {
    const rules = registry.rulesOf(name)
    if (rules === undefined) continue
    const level: StyleLevel = rules.level
    levels[level].push(
      createElement(
        'style',
        { key: name, href: name, precedence: PRECEDENCE_ORDER[level] },
        rules.css,
      ),
    )
    highest = Math.max(highest, level)
  }
  elements = levels.flatMap((list, level) =>
    list.length === 0 && level < highest ? [anchors[level] as ReactElement] : list,
  )
  byClassNames.set(classNames, elements)
  return elements
}

/**
 * Internal. In a server render, puts the style elements of `element`'s `className`, and of each
 * class list of `extra`, before `element`. On the client, returns `element`: the registry writes
 * new rules into React's groups, and React doesn't hydrate the style elements of the server.
 */
export const withServerStyles = (
  registry: StyleRegistry,
  element: ReactElement,
  ...extra: ReadonlyArray<string | false | undefined>
): ReactElement => {
  if (!isServerRender()) return element
  const own = (element.props as { className?: unknown }).className
  const classNames = [typeof own === 'string' ? own : undefined, ...extra]
    .filter((name) => typeof name === 'string' && name !== '')
    .join(' ')
  const styles = styleElementsOf(registry, classNames)
  if (styles.length === 0) return element
  return createElement(Fragment, { key: element.key ?? undefined }, ...styles, element)
}
