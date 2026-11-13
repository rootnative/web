import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { rootnative } from '../web/src/vite'

const webSource = (path: string): string =>
  decodeURIComponent(new URL(`../web/src/${path}`, import.meta.url).pathname)

// The playground imports `react-native`, as an app does. The alias points at the library
// source so edits show up with HMR. It wins over the alias of the plugin.
export default defineConfig({
  plugins: [react(), rootnative()],
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
