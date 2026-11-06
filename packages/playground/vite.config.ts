import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const webSource = (path: string): string =>
  decodeURIComponent(new URL(`../web/src/${path}`, import.meta.url).pathname)

// The playground imports `react-native`, as an app does. The alias points at the library
// source so edits show up with HMR.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': webSource('index.ts'),
      '@rootnative/web/dom': webSource('dom/index.ts'),
      '@rootnative/web': webSource('index.ts'),
    },
  },
})
