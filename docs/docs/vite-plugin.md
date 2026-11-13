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
| Reanimated aliases    | Resolves two `react-native-web` internal files, which Reanimated 4 reads its web style helpers from, to `@rootnative/web/style`. See [Compat exports](/compat).                                                                          |
| `.web` files          | Resolves `Button.web.tsx` before `Button.tsx` for an import of `./Button`, as Metro does for the web. Each extension gets a `.web` variant in front. Pre-bundled dependencies get the same list, so a library loads its `.web.js` files. |
| `__DEV__`             | Defines the React Native global: `true` on the dev server, `false` in a production build. It follows `NODE_ENV`, as React's development mode does. Pre-bundled dependencies get it too.                                                  |
| `global`              | Defines React Native's name for the global object as `globalThis`. Reanimated and Worklets read it. Pre-bundled dependencies get it too.                                                                                                 |
| `Platform.OS`         | Puts `'web'` in place of each `Platform.OS` read, so the minifier drops the code of the other platforms.                                                                                                                                 |

Your own config wins. A `react-native` alias, or a `__DEV__` or `global` define in your config, keeps its value. A `resolve.extensions` list of your own gets the `.web` variants in front.

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

With another bundler, or without the plugin, set up the alias, the `.web` extensions, `__DEV__`, and `global` yourself. In Vite:

```ts title="vite.config.ts"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const defaults = ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
const extensions = [...defaults.map((extension) => `.web${extension}`), ...defaults]
const define = {
  __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  global: 'globalThis',
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^react-native$/, replacement: '@rootnative/web' }],
    extensions,
  },
  define,
  // The dependency optimizer has its own `define` and extension list, so pre-bundled
  // libraries need them too.
  optimizeDeps: { rolldownOptions: { transform: { define }, resolve: { extensions } } },
})
```

`Platform.OS` then stays a read at run time. It still returns `'web'`.

A library that needs a [compat entry](/compat) also needs its alias. The plugin adds these three:

| Import name                                                                    | Alias to                          |
| ------------------------------------------------------------------------------ | --------------------------------- |
| `@react-native/assets-registry/registry`                                       | `@rootnative/web/assets-registry` |
| `react-native-web/dist/cjs/exports/StyleSheet/compiler/createReactDOMStyle.js` | `@rootnative/web/style`           |
| `react-native-web/dist/cjs/exports/StyleSheet/preprocess.js`                   | `@rootnative/web/style`           |
