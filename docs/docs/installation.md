---
id: installation
title: Installation
description: Install @rootnative/web, add its Vite plugin, give TypeScript the react-native types, and mount your app.
---

# Installation

You need React 19 and React DOM 19. This page uses Vite 8 and the package's Vite plugin. For another bundler, see [Without the plugin](/vite-plugin#without-the-plugin).

## Install the package

```bash
npm install @rootnative/web
```

React and React DOM are peer dependencies. A Vite React app has them already.

## Add the Vite plugin

Your app imports `react-native`. The plugin resolves that name to `@rootnative/web`:

```ts title="vite.config.ts"
import { rootnative } from '@rootnative/web/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), rootnative()],
})
```

It also resolves `.web.tsx` files first, defines `__DEV__`, and puts `'web'` in place of `Platform.OS`. See [Vite plugin](/vite-plugin).

## Add the types

TypeScript needs the same mapping. Add a declaration file to a folder that your `tsconfig.json` includes, for example `src/`:

```ts title="src/react-native.d.ts"
declare module 'react-native' {
  export * from '@rootnative/web'
}
```

Keep this file free of top-level `import` and `export` lines. With one, the declaration stops working, and TypeScript reports `Cannot find module 'react-native'`.

The file also gives you the type of `__DEV__`.

If your app has `.web.tsx` files, tell TypeScript to look for them first:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "moduleSuffixes": [".web", ""]
  }
}
```

Keep the empty string. Without it, TypeScript finds only the `.web` files.

## Mount your app

A React Native app expects a root view that fills the screen. Give the page a full-height root element that lays out its child as flex:

```html title="index.html"
<style>
  html,
  body,
  #root {
    height: 100%;
    margin: 0;
  }
  #root {
    display: flex;
    flex-direction: column;
  }
</style>
<div id="root"></div>
```

Then render your app into it with React DOM:

```tsx title="src/main.tsx"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Now `flex: 1` on your root view fills the window, as it does on iOS and Android:

```tsx title="src/App.tsx"
import { StyleSheet, Text, View } from 'react-native'

export function App() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Hello from React Native</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24 },
})
```

## Browser support

The package targets Chrome 95, Edge 95, Firefox 93, Safari 15.1, and iOS Safari 15.1. Where an older browser lacks a feature, the package uses a fallback.

See [Status](/status) for what ships today and how it's tested.
