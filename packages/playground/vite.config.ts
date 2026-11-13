import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'

import { defineConfig, type Plugin } from 'vite'

import { rootnative } from '../web/src/vite'

const webSource = (path: string): string =>
  decodeURIComponent(new URL(`../web/src/${path}`, import.meta.url).pathname)

// The playground imports `react-native`, as an app does. The alias points at the library
// source so edits show up with HMR. It wins over the alias of the plugin.
// PROTOTYPE (B5): runs the Worklets Babel plugin on the app and on the libraries with worklets.
const require = createRequire(import.meta.url)
const babel = createRequire(require.resolve('react-native-worklets/package.json'))(
  '@babel/core',
) as {
  transformSync: (
    code: string,
    options: Record<string, unknown>,
  ) => { code?: string | null; map?: unknown } | null
}
const WORKLET_ID =
  /node_modules\/(@rootnative\/inertia|react-native-reanimated|react-native-worklets)\/.*\.[cm]?[jt]sx?$|\/playground\/src\/.*\.tsx?$/
const workletize = (code: string, id: string): { code: string; map: unknown } | null => {
  const file = id.split('?')[0] as string
  if (!WORKLET_ID.test(file)) return null
  const syntax: Array<'typescript' | 'jsx'> = []
  if (/\.tsx?$/.test(file)) syntax.push('typescript')
  if (/\.[jt]sx$/.test(file)) syntax.push('jsx')
  const result = babel.transformSync(code, {
    filename: file,
    babelrc: false,
    configFile: false,
    sourceMaps: true,
    parserOpts: { plugins: syntax },
    plugins: [require.resolve('react-native-worklets/plugin')],
  })
  return result?.code == null ? null : { code: result.code, map: result.map }
}
const worklets = (): Plugin => ({
  name: 'playground:worklets',
  enforce: 'pre',
  config: () => ({
    optimizeDeps: {
      rolldownOptions: {
        plugins: [{ name: 'playground:worklets-deps', transform: workletize as never }],
      },
    },
  }),
  transform: workletize as never,
})

export default defineConfig({
  plugins: [worklets(), react(), rootnative()],
  resolve: {
    alias: {
      'react-native': webSource('index.ts'),
      '@react-native/assets-registry/registry': webSource('assets-registry/index.ts'),
      'react-native-web/dist/cjs/exports/StyleSheet/compiler/createReactDOMStyle.js':
        webSource('style/index.ts'),
      'react-native-web/dist/cjs/exports/StyleSheet/preprocess.js': webSource('style/index.ts'),
      '@rootnative/web/dom': webSource('dom/index.ts'),
      '@rootnative/web': webSource('index.ts'),
    },
  },
})
