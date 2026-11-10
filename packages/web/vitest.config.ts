import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// The bundler plugins run in Node at build time, so their tests run in Node too.
const nodeTests = ['src/bundler/**/*.test.ts', 'src/vite/**/*.test.ts']

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react/jsx-dev-runtime',
      'react-dom/client',
      'react-dom/server.browser',
      '@react-native/normalize-colors',
    ],
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, ...nodeTests],
          setupFiles: ['src/test/setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        test: {
          name: 'node',
          include: nodeTests,
          environment: 'node',
        },
      },
    ],
  },
})
