import type { Alias, AliasOptions, Plugin } from 'vite'

import { ALIASES, globalDefines, inlinePlatformOS, webExtensions } from '../bundler'
import { isProductionEnv } from '../utils/env'

// Vite's default `resolve.extensions`. A config that sets the option replaces this list, so the
// plugin starts from the same one.
const VITE_DEFAULT_EXTENSIONS = ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:$|\?)/

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isAliasArray = (alias: AliasOptions): alias is readonly Alias[] => Array.isArray(alias)

const aliasArray = (alias: AliasOptions | undefined): Alias[] => {
  if (alias === undefined) return []
  if (isAliasArray(alias)) return [...alias]
  return Object.entries(alias).map(([find, replacement]) => ({ find, replacement }))
}

const defineCode = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value)

/**
 * The Vite plugin. It points `react-native` at `@rootnative/web`, resolves `.web.*` files
 * first, defines `__DEV__`, and replaces `Platform.OS` with `'web'`.
 */
export const rootnative = (): Plugin => ({
  name: '@rootnative/web',

  // Edits the config in place, so the app's own values win. A returned partial config would
  // append the lists after the app's entries and override its defines.
  config(config) {
    config.resolve ??= {}
    // Last, so an alias in the app's config wins. The first matching alias resolves an import.
    config.resolve.alias = [
      ...aliasArray(config.resolve.alias),
      ...Object.entries(ALIASES).map(([name, replacement]) => ({
        find: new RegExp(`^${escapeRegExp(name)}$`),
        replacement,
      })),
    ]
    const extensions = webExtensions(config.resolve.extensions ?? VITE_DEFAULT_EXTENSIONS)
    config.resolve.extensions = extensions

    // Vite has set NODE_ENV before this hook runs, so `__DEV__` follows React's development mode.
    const defines = Object.fromEntries(
      Object.entries(globalDefines(isProductionEnv())).map(([name, code]) => [
        name,
        config.define?.[name] === undefined ? code : defineCode(config.define[name]),
      ]),
    )
    config.define = { ...config.define, ...defines }
    // The dep optimizer applies only its own defines, so a pre-bundled library gets them here.
    config.optimizeDeps ??= {}
    config.optimizeDeps.rolldownOptions ??= {}
    config.optimizeDeps.rolldownOptions.transform ??= {}
    config.optimizeDeps.rolldownOptions.transform.define = {
      ...defines,
      ...config.optimizeDeps.rolldownOptions.transform.define,
    }
    // The dep optimizer resolves a relative import inside a library with its own list. Without
    // the `.web` variants there, a library loads its native file, not its `.web.js` file.
    config.optimizeDeps.rolldownOptions.resolve ??= {}
    config.optimizeDeps.rolldownOptions.resolve.extensions ??= extensions
  },

  transform: {
    filter: { id: SCRIPT_ID, code: /\bPlatform\b/ },
    handler(code) {
      let program: object
      try {
        program = this.parse(code)
      } catch {
        // Not plain JavaScript yet. The module keeps its code, and a later step reports a real
        // syntax error.
        return null
      }
      const inlined = inlinePlatformOS(code, program)
      return inlined === null ? null : { code: inlined, map: null }
    },
  },
})
