import type { Alias, AliasOptions, Plugin } from 'vite'

import { ALIASES, inlinePlatformOS, webExtensions } from '../bundler'

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

/**
 * The Vite plugin. It points `react-native` at `@rootnative/web`, resolves `.web.*` files
 * first, and replaces `Platform.OS` with `'web'`.
 */
export const rootnative = (): Plugin => ({
  name: '@rootnative/web',

  // Edits the config in place: a returned partial config would append both lists after the
  // app's own entries.
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
    config.resolve.extensions = webExtensions(config.resolve.extensions ?? VITE_DEFAULT_EXTENSIONS)
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
