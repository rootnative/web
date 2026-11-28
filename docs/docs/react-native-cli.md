---
id: react-native-cli
title: React Native CLI
description: Run a React Native app with no Expo on @rootnative/web, with Metro and @rootnative/web-metro.
---

# React Native CLI

`@rootnative/web-metro` runs a React Native app with no Expo on `@rootnative/web`, with Metro. The app keeps `react-native start` and its Metro config, and gets a web platform beside iOS and Android.

## Install

The app needs React 19 and React Native 0.88.

```bash npm2yarn
npm install @rootnative/web-metro react-dom
```

Wrap your Metro config with `withRootNative`, as the last step of the config:

```js title="metro.config.js"
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { withRootNative } = require('@rootnative/web-metro/metro.cjs')

module.exports = withRootNative(mergeConfig(getDefaultConfig(__dirname), {}))
```

On iOS and Android, native code starts the app. On the web, `index.web.js` starts it. Add it beside `index.js`:

```js title="index.web.js"
import { AppRegistry } from 'react-native'

import App from './App'
import { name } from './app.json'

AppRegistry.registerComponent(name, () => App)
AppRegistry.runApplication(name, { rootTag: document.getElementById('root') })
```

Your app code doesn't change, and TypeScript keeps the types of the `react-native` package.

## The dev server

```bash
npx react-native start
```

Open `http://localhost:8081/index.html`. The React Native CLI shows a page of its own at `/`, so the web app is at `/index.html`.

An edit updates the page with Fast Refresh: the component changes, and its state stays. When an edit can't keep the state, the page reloads. When the dev server can't apply an edit, for example after a syntax error, the console of the browser shows the error.

## Build

```bash
npx rootnative-web build
```

The build writes `dist/`: `index.html`, the bundle with a hash in its name, and the images. Serve `dist/` at the root of a site: the page loads the bundle and the images from `/`.

| Option                | Use                                                                 |
| --------------------- | ------------------------------------------------------------------- |
| `--entry-file <file>` | The entry of the web app. Default: `index.web.js`, else `index.js`. |
| `--output-dir <dir>`  | The folder of the build. Default: `dist`. The build empties it.     |
| `--sourcemap`         | Also writes a source map.                                           |
| `--reset-cache`       | Clears the cache of Metro first.                                    |

## Your own page

The dev server and the build use the same page. It has a root that fills the window, and the title from `app.json`. To change the page, add an `index.html` to the app folder. Keep a `<div id="root">`, and load the dev bundle:

```html title="index.html"
<script src="/index.bundle?platform=web&dev=true&minify=false"></script>
```

The dev server serves your file at `/index.html`. The build puts its bundle in place of that script.

## How it works

On the web, `withRootNative`:

- adds `web` to the platforms of Metro, so `react-native bundle --platform web` works,
- sends `react-native` and each path of react-native-web to the package, which loads `@rootnative/web`,
- loads the browser build of each library, as Expo does on the web: no `.native` file, and no `react-native` export condition,
- runs your Babel transformer, and adds two plugins: one that makes each named import of `react-native` load only its own module of `@rootnative/web`, and React Refresh in development,
- serves the page of the dev server.

On iOS and Android, it changes nothing.

## What works

| Part                | Behavior                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Components and APIs | Each one that `@rootnative/web` has. See [Status](/status).                                                                        |
| Local images        | `require('./logo.png')` gives a number, as on native, and [`Image`](/image#local-images) loads it, with its `@2x` and `@3x` files. |
| Reanimated 4        | Animates the components. Keep `react-native-worklets/plugin` as the last plugin of `babel.config.js`.                              |
| The dev server      | The page, and Fast Refresh.                                                                                                        |
| The build           | `rootnative-web build`, or `react-native bundle --platform web` with a page of your own.                                           |

## Limits

- The build serves from the root of a site, not from a path such as `/app/`.
- Metro keeps each module of a library that the app imports. So a Metro bundle is larger than a Vite bundle of the same app: in one app, 1.4 times the size after gzip.
- The images keep their file names. Give a changed image a new name, or a host can serve the old one from its cache.
- The build copies no other file of the app folder, such as a favicon. Copy it to `dist/` yourself.
- The page renders in the browser. Metro has no static export.

## In a monorepo

React Native's Babel preset adds imports of `@babel/runtime` to each file that Metro transforms. A package that the workspace links into the app may not list `@babel/runtime`, and then Metro can't find it. Add the `node_modules` folder of the app to `nodeModulesPaths`, and the workspace root to `watchFolders`, as Expo's Metro config does in a monorepo:

```js title="metro.config.js"
const { join } = require('node:path')

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { withRootNative } = require('@rootnative/web-metro/metro.cjs')

module.exports = withRootNative(
  mergeConfig(getDefaultConfig(__dirname), {
    watchFolders: [join(__dirname, '..', '..')],
    resolver: { nodeModulesPaths: [join(__dirname, 'node_modules')] },
  }),
)
```

## Versions

The package depends on the same version of `@rootnative/web`, and works only with that version. If your app imports `@rootnative/web` itself, for example [`Head`](/seo) from `@rootnative/web/dom`, install the version that the package names.

## Names that load as stubs

A name that the import rewrite asks for and `@rootnative/web` doesn't have loads as a stub. The import works, so a library that imports the name and doesn't use it still loads. A use throws an error that names it, such as `Picker is not in @rootnative/web yet`. The file `facade-exports.json` of the package lists these names under `missing`.
