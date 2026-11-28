declare const process: { env: { NODE_ENV?: string } }

// Vite, webpack, and Metro put the mode in place of `process.env.NODE_ENV` at build time, also
// where a browser has no `process`. So the read has no `typeof process` check. The file has no
// `import.meta`: a Metro bundle is a classic script, and there it's a syntax error.
const nodeEnv = (): string | undefined => {
  try {
    return process.env.NODE_ENV
  } catch {
    return undefined
  }
}

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
