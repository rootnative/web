# Root Native Web

`@rootnative/web` is a standalone web runtime for React Native apps. You write `react-native`. It runs in the browser as a real web app.

> **Early alpha.** The API can change between releases. [Status](https://rootnative.github.io/web/status) lists what ships today.

**Docs: https://rootnative.github.io/web/**

## Why

[react-native-web](https://github.com/necolas/react-native-web) tracks React Native and stops there. This project starts from the browser and asks a different question: what does a React Native app need to be a good web app?

- **Parity first.** Every `react-native` export that ships behaves as it does on iOS and Android.
- **Web second, behind the same API.** Semantic HTML, SEO, server rendering, DOM events, logical CSS properties, and the browser features that native doesn't have.
- **Modern only.** TypeScript, ESM, React 19. No Flow, no CommonJS, no `findDOMNode`, no `forwardRef`.

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

## Learn more

- [Status](https://rootnative.github.io/web/status): what ships, what's planned, and what's out of scope.
- [Semantic HTML](https://rootnative.github.io/web/semantic-html), [Styles](https://rootnative.github.io/web/styles), [Server rendering](https://rootnative.github.io/web/server-rendering), and [SEO](https://rootnative.github.io/web/seo).
- One page for each [component](https://rootnative.github.io/web/view) and [API](https://rootnative.github.io/web/stylesheet).
- For AI agents: [llms.txt](https://rootnative.github.io/web/llms.txt) and [llms-full.txt](https://rootnative.github.io/web/llms-full.txt). The package ships `llms.txt` too, so `node_modules/@rootnative/web/llms.txt` describes the version you installed.

## Development

```sh
pnpm install
pnpm --filter @rootnative/playground dev # one route per component
pnpm docs:dev # the docs site
pnpm test # Vitest in a real Chromium
pnpm lint
pnpm typecheck
pnpm build
```

The monorepo uses pnpm, TypeScript 7, tsdown, Vitest 5 in browser mode with Playwright, oxlint, Prettier, and Docusaurus.

```
packages/
  web/          @rootnative/web
  playground/   Vite app with one route per component
docs/           the docs site
scripts/        build-llms.mjs
```

Each component lives in one folder with its types and its tests.

After you change a docs page, run `pnpm build:llms`. It writes `docs/static/llms-full.txt` and copies `docs/static/llms.txt` into the package. CI fails when they don't match the pages. After an API change, also edit `docs/static/llms.txt`, which is written by hand.

## License

[MIT](./LICENSE)
