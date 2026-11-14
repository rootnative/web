import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const source = (path) => fileURLToPath(new URL(`../web/src/${path}`, import.meta.url))

// The tests load the source of the runtime, so they need no build of `@rootnative/web`.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@rootnative\/web\/server$/, replacement: source('server/index.ts') },
      { find: /^@rootnative\/web$/, replacement: source('index.ts') },
    ],
  },
})
