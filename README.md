# @rootnative/web

A standalone web runtime for React Native apps. You write `react-native`. It runs in the browser as a real web app.

> **Status: early alpha.** The package is not on npm yet. The API below is what the repository builds today. See [Supported APIs](#supported-apis) for the exact list.

## Why

[react-native-web](https://github.com/necolas/react-native-web) tracks React Native and stops there. This project starts from the browser and asks a different question: what does a React Native app need to be a good web app?

- **Parity first.** Every `react-native` export we ship behaves as it does on iOS and Android.
- **Web second, behind the same API.** Semantic HTML, SEO, server rendering, DOM events, logical CSS properties, and every browser capability that native lacks.
- **Modern only.** TypeScript, ESM, React 19. No Flow, no CommonJS, no `findDOMNode`, no `forwardRef`.

## How it works

| Layer  | Import                   | Content                                                          |
| ------ | ------------------------ | ---------------------------------------------------------------- |
| Parity | `@rootnative/web`        | React Native components and APIs                                 |
| Web    | `@rootnative/web/dom`    | Browser features that native does not have, for example `<Head>` |
| Server | `@rootnative/web/server` | Server rendering helpers                                         |

Your app imports `react-native`. A bundler alias maps that name to `@rootnative/web`.

### Semantic HTML

`role` picks the HTML element. No extra props.

```tsx
<View role="main">
  <View role="navigation" />
  <Text role="heading" aria-level={1}>
    Title
  </Text>
  <View role="list">
    <View role="listitem">
      <Text>One</Text>
    </View>
  </View>
  <Text href="/about" role="link">
    About
  </Text>
</View>
```

```html
<main>
  <nav></nav>
  <h1>Title</h1>
  <ul>
    <li><span>One</span></li>
  </ul>
  <a href="/about">About</a>
</main>
```

### Styles

Styles compile to atomic CSS classes at runtime. One class per declaration, shared across the app.

- Numbers get `px`. Colors normalize with the same parser as React Native.
- `flex: 1` means `1 1 0%`, as on native. `flex: 0` keeps the intrinsic size.
- `marginStart`, `paddingEnd`, `start`, `end`, and `borderTopStartRadius` map to logical CSS properties, so RTL works through the browser.
- `boxShadow`, `filter`, `mixBlendMode`, `display: 'contents'`, `position: 'static'`, `gap`, and `inset` pass through.
- A longhand always wins over a shorthand, whatever the key order, as on native.

### Server rendering

```tsx
import { renderToString } from 'react-dom/server'
import { createStyleRegistry, StyleRegistryProvider, styleTagsHTML } from '@rootnative/web/server'

const registry = createStyleRegistry()
const body = renderToString(
  <StyleRegistryProvider registry={registry}>
    <App />
  </StyleRegistryProvider>,
)
const html = `<!doctype html><html><head>${styleTagsHTML(registry)}</head><body>${body}</body></html>`
```

One registry per request. The client adopts the rendered style elements on hydration and inserts nothing twice.

### SEO

```tsx
import { Head } from '@rootnative/web/dom'

;<Head
  title="Page title"
  description="What the page is about"
  canonical="https://example.com/page"
  openGraph={{ title: 'Page title', image: 'https://example.com/og.png' }}
  jsonLd={{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'Page title' }}
/>
```

React 19 moves `<title>`, `<meta>`, and `<link>` into `<head>` on the server and on the client.

## Setup

Until the package is on npm, link the workspace package or use a path alias.

**Vite**

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: { 'react-native': '@rootnative/web' },
  },
})
```

**TypeScript**

```json
{
  "compilerOptions": {
    "paths": { "react-native": ["./node_modules/@rootnative/web"] }
  }
}
```

A Vite plugin that sets the alias, resolves `.web.tsx` files, and inlines `Platform.OS` is planned. The library works without it.

## Supported APIs

**Components:** `View`, `Text`, `Pressable`

**APIs:** `StyleSheet`, `Platform`, `Dimensions`, `useWindowDimensions`, `usePressability`

**Web layer:** `Head`

**Server:** `createStyleRegistry`, `StyleRegistryProvider`, `renderStyleTags`, `styleTagsHTML`

Notes on the web behavior of shipped props:

| Prop                                 | Behavior                                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`                               | Picks the element. Roles with no implicit element, and the table roles, keep a `role` attribute.                                                                     |
| `aria-level`                         | Web only. The heading level, 1 to 6. Default 2.                                                                                                                      |
| `href`, `target`, `rel`, `download`  | Web only. Render an anchor.                                                                                                                                          |
| `on*` DOM handlers                   | Pass through to the element. `onClick`, `onKeyDown`, `onPointerDown`, and the rest.                                                                                  |
| `onLayout`                           | A `ResizeObserver`. Fires after mount and after each size change.                                                                                                    |
| `pointerEvents`                      | `none`, `auto`, `box-none`, and `box-only`.                                                                                                                          |
| `numberOfLines`                      | 1 truncates with an ellipsis. More lines clamp.                                                                                                                      |
| `ellipsizeMode`                      | `tail` and `clip`. `head` and `middle` fall back to `tail` for now.                                                                                                  |
| `selectable`                         | On by default on the web. `false` sets `user-select: none`.                                                                                                          |
| `Text` `onPress`                     | A click. `Text` has no `onPressIn`, `onPressOut`, or `onLongPress` yet.                                                                                              |
| `Platform.isDisableAnimations`       | Follows `prefers-reduced-motion`.                                                                                                                                    |
| `Dimensions.get('window').fontScale` | The root font size divided by 16, the browser's font-size preference.                                                                                                |
| `usePressability`                    | Returns pointer, keyboard, and focus handlers, not responder handlers. Spread them on a `View`.                                                                      |
| `usePressability` `onPress`          | Gets the `pointerup` event. A keyboard or assistive-technology activation gets the `click` event. `preventDefault()` cancels the click, so a link does not navigate. |
| Press events                         | `nativeEvent` is the DOM event, with `locationX`, `locationY`, `pageX`, `pageY`, `timestamp`, `touches`, and `changedTouches` added.                                 |
| `Pressable` state                    | `pressed`, and web-only `hovered` and `focused`. `focused` is true for keyboard focus only (`:focus-visible`).                                                       |
| `Pressable` `hitSlop`                | An invisible `::before` box grows the hit area. A parent with `overflow: hidden` clips it.                                                                           |
| `Pressable` `cancelable={false}`     | Sets `touch-action: none`, so a scroll that starts on the element cannot cancel the press.                                                                           |
| `Pressable` `disabled`               | Sets `aria-disabled` and takes the element out of the tab order.                                                                                                     |
| `role="button"`                      | Renders `<button type="button">`, so it never submits a form.                                                                                                        |

## Not supported

- The `react-native-web` internals and file layout.
- Expo and Metro. A Metro plugin is out of scope for 1.0.
- React 18, CommonJS, Flow.
- Props that React Native does not have, except the small web-only set above.

## Browser support

Chrome 95, Edge 95, Firefox 93, Safari 15.1, iOS Safari 15.1.

## Development

```sh
pnpm install
pnpm --filter @rootnative/playground dev   # one route per component
pnpm test                                  # Vitest in a real Chromium
pnpm lint
pnpm typecheck
pnpm build
```

The monorepo uses pnpm, TypeScript 7, tsdown, Vitest 5 in browser mode with Playwright, oxlint, and Prettier.

```
packages/
  web/          @rootnative/web
  playground/   Vite app with one route per component
```

Each component lives in one folder with its types and its tests.

## License

[MIT](./LICENSE)
