import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/assets-registry/index.ts',
    'src/dom/index.ts',
    'src/style/index.ts',
    'src/vite/index.ts',
  ],
  // One output file for each source file, at the same path under `dist/`. Metro has no tree
  // shaking, so a single bundled file loads the whole runtime into each Expo app.
  // `@rootnative/web-expo` imports these files through the `internal/*` export.
  unbundle: true,
  root: 'src',
  format: 'esm',
  platform: 'browser',
  target: 'es2021',
  // For the browser platform, the bundler replaces `process.env.NODE_ENV` with 'development'.
  // That fixes the mode of every app at our build time. This entry keeps the read in the output,
  // so the app's bundler, or Node, gives the value.
  define: { 'process.env.NODE_ENV': 'process.env.NODE_ENV' },
  dts: true,
  sourcemap: true,
  clean: true,
})
