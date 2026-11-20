// The hybrid style delivery of `View`. In a server render, each view renders its classes as
// React 19 `<style href precedence>` elements, as `HoistedView` does. On the client, it renders
// no style element: the hybrid registry writes each new rule with CSSOM into the last element of
// React's group for its level, and adopts the rules that the server sent.

import type { ReactElement } from 'react'

import { useViewElement } from '../../../packages/web/src/components/View'
import type { ViewProps } from '../../../packages/web/src/components/View/types'
import { StyleRegistry } from '../../../packages/web/src/style/registry'
import { PRECEDENCE, styleElements } from './HoistedView'

// The page makes its server HTML in the browser, so a flag, not `typeof document`, tells that a
// render is a server render.
let serverRender = false

export const isServerRender = (): boolean => serverRender

export const renderAsServer = <T,>(render: () => T): T => {
  serverRender = true
  try {
    return render()
  } finally {
    serverRender = false
  }
}

const leadingClass = /^\.([\w-]+)/

let hybridRegistry: StyleRegistry | null = null

// The first client render creates it, after the server HTML is in the page, so it adopts the
// rules of the server. A group that the page doesn't have gets a new element in its place.
export const getHybridRegistry = (): StyleRegistry => {
  if (hybridRegistry !== null) return hybridRegistry
  const groups = PRECEDENCE.map((precedence) =>
    Array.from(
      document.querySelectorAll<HTMLStyleElement>(`style[data-precedence="${precedence}"]`),
    ),
  )
  const targets: HTMLStyleElement[] = []
  for (const [index, precedence] of PRECEDENCE.entries()) {
    let target = groups[index]?.at(-1)
    if (target === undefined) {
      target = document.createElement('style')
      target.dataset['precedence'] = precedence
      const previous = targets[index - 1]
      const next = groups.slice(index + 1).flat()[0]
      if (previous !== undefined) previous.after(target)
      else if (next !== undefined) next.before(target)
      else document.head.append(target)
    }
    targets.push(target)
  }
  const [reset, shorthand, longhand] = targets.map((target) => target.sheet)
  const registry = new StyleRegistry({
    reset: reset ?? null,
    shorthand: shorthand ?? null,
    longhand: longhand ?? null,
  })
  // The constructor adopts only the three target sheets.
  for (const element of groups.flat()) {
    for (const rule of Array.from(element.sheet?.cssRules ?? [])) {
      if (!(rule instanceof CSSStyleRule)) continue
      const name = leadingClass.exec(rule.selectorText)?.[1]
      if (name !== undefined) registry['adopted'].add(name)
    }
  }
  hybridRegistry = registry
  return registry
}

// Needs `hoistingRegistry` in `StyleRegistryContext` in a server render, and the hybrid registry
// on the client. React doesn't hydrate hoisted styles, so the two trees can differ there.
export function HybridView(props: ViewProps): ReactElement {
  const element = useViewElement(props)
  if (!serverRender) return element
  const { className } = element.props as { className: string }
  return (
    <>
      {styleElements(className)}
      {element}
    </>
  )
}
