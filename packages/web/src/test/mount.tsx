import type { ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach } from 'vitest'

import { cleanup } from './render'

// A virtualized list moves its window on timers, resize observer callbacks, and scroll events.
// Inside act(), React holds each render until the scope ends, so a test of a list renders the way
// an app does: with flushSync, and with the act environment off.

export type Mounted = {
  container: HTMLElement
  rerender: (element: ReactElement) => void
}

const roots = new Set<{ root: Root; container: HTMLElement }>()

export const mount = (element: ReactElement): Mounted => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  roots.add({ root, container })
  flushSync(() => root.render(element))
  return { container, rerender: (next) => flushSync(() => root.render(next)) }
}

// Call once at the top level of a test file. A test that needs act(), for example to catch a
// render error, sets IS_REACT_ACT_ENVIRONMENT back to true and uses `render`.
export const renderOutsideAct = (): void => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = false
  })
  afterEach(() => {
    for (const { root, container } of roots) {
      flushSync(() => root.unmount())
      container.remove()
    }
    roots.clear()
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    cleanup()
  })
}
