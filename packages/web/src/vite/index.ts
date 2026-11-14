import type { Alias, AliasOptions, Plugin } from 'vite'

import {
  ALIASES,
  createWorkletTransform,
  globalDefines,
  inlinePlatformOS,
  WORKLET_CODE,
  webExtensions,
  type WorkletTransform,
} from '../bundler'
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

const PLATFORM_CODE = /\bPlatform\b/

export type RootnativeOptions = {
  /**
   * Runs the Babel plugin of `react-native-worklets` on your code and on the libraries that
   * have worklets. Reanimated needs it, and so does a library built on Reanimated. The app
   * must have `react-native-worklets` and `@babel/core`. Default: `false`.
   */
  worklets?: boolean | undefined
}

/**
 * The Vite plugin. It points `react-native` at `@rootnative/web`, resolves `.web.*` files
 * first, defines `__DEV__`, and replaces `Platform.OS` with `'web'`.
 */
export const rootnative = (options: RootnativeOptions = {}): Plugin => {
  let workletize: WorkletTransform | undefined

  return {
    name: '@rootnative/web',

    // Edits the config in place, so the app's own values win. A returned partial config would
    // append the lists after the app's entries and override its defines.
    config(config) {
      if (options.worklets === true) {
        const transform = createWorkletTransform(config.root ?? process.cwd())
        workletize = transform
        // The dev server pre-bundles the libraries, and a `transform` hook of a Vite plugin
        // never sees their files. The optimizer takes its own plugin.
        config.optimizeDeps ??= {}
        config.optimizeDeps.rolldownOptions ??= {}
        const rolldownOptions = config.optimizeDeps.rolldownOptions
        rolldownOptions.plugins = [
          rolldownOptions.plugins,
          {
            name: '@rootnative/web:worklets',
            transform: { filter: { id: SCRIPT_ID, code: WORKLET_CODE }, handler: transform },
          },
        ] as typeof rolldownOptions.plugins
      }

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
      filter: {
        id: SCRIPT_ID,
        code: options.worklets === true ? [PLATFORM_CODE, WORKLET_CODE] : PLATFORM_CODE,
      },
      async handler(code, id) {
        // The Worklets step comes first, as the last plugin of the Babel preset does on native:
        // it reads the functions that the other transforms made.
        const worklets = workletize === undefined ? null : await workletize(code, id)
        const current = worklets?.code ?? code
        if (!PLATFORM_CODE.test(current)) return worklets

        let program: object
        try {
          program = this.parse(current)
        } catch {
          // Not plain JavaScript yet. The module keeps its code, and a later step reports a real
          // syntax error.
          return worklets
        }
        const inlined = inlinePlatformOS(current, program)
        if (inlined === null) return worklets
        // The replaced reads change only columns on their own lines, so the map of the
        // Worklets step stays close.
        return { code: inlined, map: worklets?.map ?? null }
      },
    },
  }
}
