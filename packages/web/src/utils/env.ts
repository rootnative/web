declare const process: { env: { NODE_ENV?: string } } | undefined

declare global {
  interface ImportMeta {
    env?: { MODE?: string }
  }
}

const nodeEnv = (): string | undefined =>
  typeof process !== 'undefined' ? process.env.NODE_ENV : import.meta.env?.MODE

export const isTestEnv = (): boolean => nodeEnv() === 'test'

export const isProductionEnv = (): boolean => nodeEnv() === 'production'

export const hasDOM = (): boolean =>
  typeof window !== 'undefined' && typeof document !== 'undefined'

let serverRenderOverride = false

// A render on a server: no DOM, or a render inside `renderAsServer`. A component then renders
// its CSS as React 19 `<style href precedence>` elements.
export const isServerRender = (): boolean => serverRenderOverride || !hasDOM()

// Internal. Makes `render` a server render in a browser, for the tests and the benchmark, which
// make server HTML in the page.
export const renderAsServer = <T>(render: () => T): T => {
  serverRenderOverride = true
  try {
    return render()
  } finally {
    serverRenderOverride = false
  }
}

export const matchesMedia = (query: string): boolean =>
  hasDOM() && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
