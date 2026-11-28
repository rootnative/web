# @rootnative/web

[![npm](https://img.shields.io/npm/v/@rootnative/web.svg)](https://www.npmjs.com/package/@rootnative/web)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/rootnative/web/blob/main/LICENSE)

A standalone web runtime for React Native apps. You write `react-native`. It runs in the browser as a real web app, with semantic HTML, atomic CSS, server rendering, and SEO tags.

[Status](https://rootnative.github.io/web/status) lists what ships today, and the [changelog](https://github.com/rootnative/web/blob/main/packages/web/CHANGELOG.md) lists the changes in each release.

**Docs: https://rootnative.github.io/web/**

## Install

### Expo (Metro)

Install `@rootnative/web-expo`, and remove react-native-web:

```bash
npm install @rootnative/web-expo
npm uninstall react-native-web
```

Wrap your Metro config with `withRootNative`:

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config')
const { withRootNative } = require('@rootnative/web-expo/metro.cjs')

module.exports = withRootNative(getDefaultConfig(__dirname))
```

Your app code doesn't change. [Expo](https://rootnative.github.io/web/expo) shows a setup with no Metro config, and what works.

### Vite

```bash
npm install @rootnative/web
```

React 19 and React DOM 19 are peer dependencies. Add the Vite plugin to `vite.config.ts`. It resolves `react-native` to the package:

```ts
import { rootnative } from '@rootnative/web/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), rootnative()],
})
```

Give TypeScript the same mapping in `src/react-native.d.ts`:

```ts
declare module 'react-native' {
  export * from '@rootnative/web'
}
```

[Installation](https://rootnative.github.io/web/installation) shows how to mount the app, so that `flex: 1` fills the window.

## Example

```tsx
import { StyleSheet, Text, View } from 'react-native'

export function App() {
  return (
    <View role="main" style={styles.screen}>
      <Text role="heading" aria-level={1} style={styles.title}>
        Hello from React Native
      </Text>
      <Text href="/about">About</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 24 },
})
```

In the browser, this is a `<main>` with an `<h1>` and an `<a href="/about">`, styled with atomic CSS classes. The same code runs on iOS and Android.

## Benchmarks

Three apps moved from react-native-web 0.21 to `@rootnative/web`. In each app, the script time at load is 8–20 % lower, and the JavaScript is 2–4 % smaller after gzip. With static output, the server HTML is 31–57 % smaller after gzip. Some interactions cost more style work. [Benchmarks](https://rootnative.github.io/web/benchmarks) gives every number, also the worse ones.

## For AI agents

This package ships `llms.txt`. `node_modules/@rootnative/web/llms.txt` describes the API of the version you installed. The docs site has [llms-full.txt](https://rootnative.github.io/web/llms-full.txt) with every page.

## License

[MIT](https://github.com/rootnative/web/blob/main/LICENSE)
