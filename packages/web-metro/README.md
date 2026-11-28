# @rootnative/web-metro

Runs a React Native app with no Expo on [`@rootnative/web`](https://rootnative.github.io/web/), with Metro. For an Expo app, use [`@rootnative/web-expo`](https://rootnative.github.io/web/expo).

## Install

The app needs React 19 and React Native 0.88.

```sh
npm install @rootnative/web-metro react-dom
```

Wrap your Metro config with `withRootNative`, as the last step of the config:

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { withRootNative } = require('@rootnative/web-metro/metro.cjs')

module.exports = withRootNative(mergeConfig(getDefaultConfig(__dirname), {}))
```

On the web, `withRootNative` sends `react-native` to `@rootnative/web`. On iOS and Android, it changes nothing.

On iOS and Android, native code starts the app. On the web, `index.web.js` starts it. Add it beside `index.js`:

```js
// index.web.js
import { AppRegistry } from 'react-native'

import App from './App'
import { name } from './app.json'

AppRegistry.registerComponent(name, () => App)
AppRegistry.runApplication(name, { rootTag: document.getElementById('root') })
```

## Develop

```sh
npx react-native start
```

Open `http://localhost:8081/index.html`. The CLI shows its own page at `/`. An edit updates the page with Fast Refresh.

## Build

```sh
npx rootnative-web build
```

The build writes `dist/`: `index.html`, the bundle with a hash in its name, and the images. Serve `dist/` at the root of a site.

| Option                | Use                                                                 |
| --------------------- | ------------------------------------------------------------------- |
| `--entry-file <file>` | The entry of the web app. Default: `index.web.js`, else `index.js`. |
| `--output-dir <dir>`  | The folder of the build. Default: `dist`.                           |
| `--sourcemap`         | Also writes a source map.                                           |
| `--reset-cache`       | Clears the cache of Metro first.                                    |

## Your own page

The dev server and the build use the same page. To change it, add an `index.html` to the app folder. Keep a `<div id="root">`, and load the dev bundle:

```html
<script src="/index.bundle?platform=web&dev=true&minify=false"></script>
```

The build puts its bundle in place of that script.

## Versions

This package depends on the same version of `@rootnative/web`, and works only with that version. Don't add a different version of `@rootnative/web` to your app.

The names of React Native that `@rootnative/web` doesn't have yet load as stubs, and a stub throws when your code uses it. `facade-exports.json` lists them under `missing`.
