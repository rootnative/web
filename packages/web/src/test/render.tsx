import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

export type Rendered = {
  container: HTMLElement
  rerender: (element: ReactElement) => void
  unmount: () => void
}

const roots = new Set<{ root: Root; container: HTMLElement }>()

export const render = (element: ReactElement): Rendered => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const entry = { root, container }
  roots.add(entry)

  act(() => root.render(element))

  return {
    container,
    rerender: (next) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount())
      container.remove()
      roots.delete(entry)
    },
  }
}

export const cleanup = (): void => {
  for (const { root, container } of roots) {
    act(() => root.unmount())
    container.remove()
  }
  roots.clear()
}
