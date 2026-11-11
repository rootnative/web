import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// The bundler plugins run in Node at build time, so their tests run in Node too.
const nodeTests = ['src/bundler/**/*.test.ts', 'src/vite/**/*.test.ts']

// CI sets TEST_BROWSERS to all three engines. The default is Chromium only, so a local run
// needs one browser download.
const engines = ['chromium', 'firefox', 'webkit'] as const
const requested = (process.env.TEST_BROWSERS ?? 'chromium').split(',')
const unknown = requested.filter((name) => !engines.some((engine) => engine === name))
if (unknown.length > 0) {
  throw new Error(
    `TEST_BROWSERS has "${unknown.join(', ')}". Use chromium, firefox, or webkit, with commas.`,
  )
}
const browsers = engines.filter((engine) => requested.includes(engine))

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
            instances: browsers.map((browser) => ({ browser })),
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
