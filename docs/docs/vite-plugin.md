---
id: vite-plugin
title: Vite plugin
description: What rootnative() from @rootnative/web/vite changes in your Vite config and your code, and the config for a setup without it.
---

# Vite plugin

`rootnative()` from `@rootnative/web/vite` sets up Vite 8 for a React Native app. It takes no options.

```ts title="vite.config.ts"
import { rootnative } from '@rootnative/web/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), rootnative()],
})
```

## What it does

| Part                  | What it does                                                                                                                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react-native` alias  | Resolves the import name `react-native` to `@rootnative/web`. Only the exact name: a deep import such as `react-native/Libraries/Image` doesn't resolve.                                                                                 |
| Assets registry alias | Resolves `@react-native/assets-registry/registry` to `@rootnative/web/assets-registry`. Libraries such as `react-native-svg` import that module on the web.                                                                              |
| `.web` files          | Resolves `Button.web.tsx` before `Button.tsx` for an import of `./Button`, as Metro does for the web. Each extension gets a `.web` variant in front. Pre-bundled dependencies get the same list, so a library loads its `.web.js` files. |
| `__DEV__`             | Defines the React Native global: `true` on the dev server, `false` in a production build. It follows `NODE_ENV`, as React's development mode does. Pre-bundled dependencies get it too.                                                  |
| `Platform.OS`         | Puts `'web'` in place of each `Platform.OS` read, so the minifier drops the code of the other platforms.                                                                                                                                 |

Your own config wins. A `react-native` alias or a `__DEV__` define in your config keeps its value. A `resolve.extensions` list of your own gets the `.web` variants in front.

TypeScript doesn't read the Vite config. For `.web` files, add `moduleSuffixes` to `tsconfig.json`, as [Installation](/installation#add-the-types) shows.

## `Platform.OS`

The plugin changes a read of `Platform.OS` when `Platform` comes from `react-native` or `@rootnative/web`. Named, renamed, and namespace imports all count:

```tsx
import { Platform } from 'react-native'

const label = Platform.OS === 'ios' ? 'iPhone' : 'Web'
// The build sees 'web' === 'ios', so only 'Web' stays in the bundle.
```

At run time `Platform.OS` is `'web'` anyway, so only the bundle size changes. Some reads keep their code, for example when a local variable in the same file has the name `Platform`. On the dev server, pre-bundled dependencies keep their reads too. `Platform.select` keeps its code.

## Server rendering

With Vite's server rendering, the plugin applies to your app code on the server too.

Vite leaves most dependencies to Node, and Node doesn't get the `__DEV__` define. A dependency that reads `__DEV__` then throws a `ReferenceError` on the server. Add that dependency to `ssr.noExternal`, so that Vite transforms it:

```ts title="vite.config.ts"
export default defineConfig({
  plugins: [react(), rootnative()],
  ssr: { noExternal: ['some-library'] },
})
```

## Without the plugin

With another bundler, or without the plugin, set up the alias, the `.web` extensions, and `__DEV__` yourself. In Vite:

```ts title="vite.config.ts"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const extensions = ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
const dev = JSON.stringify(process.env.NODE_ENV !== 'production')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^react-native$/, replacement: '@rootnative/web' }],
    extensions: [...extensions.map((extension) => `.web${extension}`), ...extensions],
  },
  define: { __DEV__: dev },
  // The dependency optimizer doesn't apply `define`, so pre-bundled libraries need their own.
  optimizeDeps: { rolldownOptions: { transform: { define: { __DEV__: dev } } } },
})
```

`Platform.OS` then stays a read at run time. It still returns `'web'`.
