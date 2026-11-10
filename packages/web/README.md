# @rootnative/web

[![npm](https://img.shields.io/npm/v/@rootnative/web.svg)](https://www.npmjs.com/package/@rootnative/web)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/rootnative/web/blob/main/LICENSE)

A standalone web runtime for React Native apps. You write `react-native`. It runs in the browser as a real web app, with semantic HTML, atomic CSS, server rendering, and SEO tags.

> **Early alpha.** The API can change between releases. [Status](https://rootnative.github.io/web/status) lists what ships today, and the [changelog](https://github.com/rootnative/web/blob/main/packages/web/CHANGELOG.md) lists the changes in each release.

**Docs: https://rootnative.github.io/web/**

## Install

```bash
npm install @rootnative/web
```

React 19 and React DOM 19 are peer dependencies. Point `react-native` at the package in `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { 'react-native': '@rootnative/web' },
  },
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

## For AI agents

This package ships `llms.txt`. `node_modules/@rootnative/web/llms.txt` describes the API of the version you installed. The docs site has [llms-full.txt](https://rootnative.github.io/web/llms-full.txt) with every page.

## License

[MIT](https://github.com/rootnative/web/blob/main/LICENSE)
