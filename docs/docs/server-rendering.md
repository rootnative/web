---
id: server-rendering
title: Server rendering
description: Render a React Native app to HTML on the server, collect its CSS, and hydrate it in the browser without a flash or a duplicate rule.
---

# Server rendering

The server renders your app to HTML with React DOM. A style registry collects the CSS of that render, and you write it into `<head>`. The browser then hydrates the same app.

## On the server

Render the whole document with React, not only the app:

```tsx title="server.tsx"
import { renderToString } from 'react-dom/server'
import { createStyleRegistry, StyleRegistryProvider, styleTagsHTML } from '@rootnative/web/server'

import { App } from './App'

export function renderPage(): string {
  const registry = createStyleRegistry()
  const html = renderToString(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div id="root">
          <StyleRegistryProvider registry={registry}>
            <App />
          </StyleRegistryProvider>
        </div>
        <script type="module" src="/client.js" />
      </body>
    </html>,
  )
  return `<!doctype html>${html.replace('</head>', `${styleTagsHTML(registry)}</head>`)}`
}
```

The script path depends on your bundler. Put the root CSS from [Installation](/installation#mount-your-app) in the head too.

Three rules:

- **One registry per request.** A shared registry mixes the CSS of two requests.
- **Write the style tags after the render ends.** The registry fills while React renders. A head that you send before the body renders misses the CSS of that body.
- **Render the `<head>` with React.** React 19 puts the `<title>` and `<meta>` elements of [`Head`](/seo) into the `<head>` that it renders. If you render only the app and paste it into a template, they land at the start of `<body>`.

Your server code needs the `react-native` alias too, so that `App` and its imports resolve to `@rootnative/web`.

`renderStyleTags(registry)` returns the same two `<style>` elements as React elements. Use it when your framework takes head elements, not a string.

## In the browser

Hydrate the same app into the same element:

```tsx title="client.tsx"
import { hydrateRoot } from 'react-dom/client'

import { App } from './App'

hydrateRoot(document.getElementById('root')!, <App />)
```

The client needs no provider. It finds the two `<style>` elements by their id and adopts their rules, so it inserts no rule twice.

## Values that differ on the server

The server doesn't know the window or the user's settings. Two hooks return a fixed value on the server and during hydration, so the first client render matches the server HTML. The real value arrives right after hydration.

| Hook                    | On the server and during hydration                |
| ----------------------- | ------------------------------------------------- |
| `useWindowDimensions()` | `{ width: 0, height: 0, scale: 1, fontScale: 1 }` |
| `useColorScheme()`      | `'light'`                                         |

In render, use these hooks, not `Dimensions.get()` or `Appearance.getColorScheme()`. The two getters return the fixed value on the server but the real value in the browser at once, so a render that reads them doesn't match the server HTML.

A layout that depends on the window width renders its zero-width branch first. Use flex and percentages for the first paint, and refine after hydration.
