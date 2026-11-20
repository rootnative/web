---
id: server-rendering
title: Server rendering
description: Render a React Native app to HTML on the server, with the CSS of each component in the page, and hydrate it in the browser without a flash or a duplicate rule.
---

# Server rendering

The server renders your app to HTML with React DOM. Each component puts its CSS into the render as React 19 `<style>` elements, and React puts them in the page. The browser then hydrates the same app.

## On the server

Render the whole document with React, not only the app:

```tsx title="server.tsx"
import { renderToString } from 'react-dom/server'

import { App } from './App'

export function renderPage(): string {
  const html = renderToString(
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div id="root">
          <App />
        </div>
        <script type="module" src="/client.js" />
      </body>
    </html>,
  )
  return `<!doctype html>${html}`
}
```

The script path depends on your bundler. Put the root CSS from [Installation](/installation#mount-your-app) in the head too.

React puts the CSS of the render into `<head>`, in three groups, in this order: the defaults of the components, the shorthands, then the longhands. Each render gets only the CSS that it uses. You need no provider, no registry, and no step after the render.

React 19 also puts the `<title>` and `<meta>` elements of [`Head`](/seo) into the `<head>` that it renders. So render the `<head>` with React.

Your server code needs the same setup, so that `App` and its imports resolve to `@rootnative/web`. With Vite's server rendering, the [Vite plugin](/vite-plugin#server-rendering) does it.

## Into a template

If your server pastes the app into an HTML template, render only the app:

```tsx title="server.tsx"
const app = renderToString(<App />)
const page = template.replace('<!--app-->', app)
```

React then puts the style elements at the start of the app's HTML, inside `<div id="root">`. They apply there, and the client hydrates past them. The `<title>` and `<meta>` elements of `Head` also land there, not in `<head>`. For them, render the whole document.

## In the browser

Hydrate the same app into the same element:

```tsx title="client.tsx"
import { hydrateRoot } from 'react-dom/client'

import { App } from './App'

hydrateRoot(document.getElementById('root')!, <App />)
```

The client finds the three groups of the server by their `data-precedence`: `rootnative-reset`, `rootnative-shorthand`, and `rootnative-longhand`. It adopts their rules, so it inserts no rule twice. A rule that the client needs later goes into the group of its kind, so the order holds. A page with no server render gets the three groups from the client.

A server render under a DOM emulation, such as jsdom, takes the browser path. Its HTML then has no style elements.

## The old API

`createStyleRegistry`, `StyleRegistryProvider`, `renderStyleTags`, and `styleTagsHTML` from `@rootnative/web/server` are deprecated. A server render needs none of them. They do nothing now, so code that still calls them keeps its styles. Remove the calls: the functions go away before 1.0.

## Values that differ on the server

The server doesn't know the window or the user's settings. Two hooks return a fixed value on the server and during hydration, so the first client render matches the server HTML. The real value arrives right after hydration.

| Hook                    | On the server and during hydration                |
| ----------------------- | ------------------------------------------------- |
| `useWindowDimensions()` | `{ width: 0, height: 0, scale: 1, fontScale: 1 }` |
| `useColorScheme()`      | `'light'`                                         |

In render, use these hooks, not `Dimensions.get()` or `Appearance.getColorScheme()`. The two getters return the fixed value on the server but the real value in the browser at once, so a render that reads them doesn't match the server HTML.

A layout that depends on the window width renders its zero-width branch first. Use flex and percentages for the first paint, and refine after hydration.
