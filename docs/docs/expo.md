---
id: expo
title: Expo
description: Run an Expo app on @rootnative/web with @rootnative/web-expo, which takes the place of react-native-web.
---

# Expo

`@rootnative/web-expo` runs an Expo app on `@rootnative/web` in place of react-native-web. You keep your Expo setup: the dev server, `expo export`, and the Babel preset.

## Install

Install the package, and remove react-native-web:

```bash npm2yarn
npm install @rootnative/web-expo
npm uninstall react-native-web
```

Wrap your Metro config with `withRootNative`. If your app has no `metro.config.js`, add this one:

```js title="metro.config.js"
const { getDefaultConfig } = require('expo/metro-config')
const { withRootNative } = require('@rootnative/web-expo/metro.cjs')

module.exports = withRootNative(getDefaultConfig(__dirname))
```

On the web, `withRootNative` sends each import of `react-native` and of react-native-web to the package. On iOS and Android, it changes nothing. Restart the dev server with `--clear` after the change:

```bash
npx expo start --clear
```

Keep `react-dom` in the `dependencies` of your `package.json`. Expo then warns that react-native-web isn't installed, but the warning doesn't stop the dev server or `expo export`. Without `react-dom` there, Expo stops with an error.

Your code doesn't change, and TypeScript keeps the types of the `react-native` package.

### Without a Metro config

You can also install the package under the name `react-native-web`, with an npm alias. Then the app needs no `withRootNative`:

```bash npm2yarn
npm install react-native-web@npm:@rootnative/web-expo
```

An Expo app with web support lists `react-native-web` already, and the alias takes its place.

### Versions

The package depends on the same version of `@rootnative/web`, and works only with that version. If your app imports `@rootnative/web` itself, for example [`Head`](/seo) from `@rootnative/web/dom`, install the version that the package names.

## How it works

On the web, Expo's bundler rewrites `import { View } from 'react-native'` to an import of `react-native-web/dist/exports/View`. `withRootNative`, or the alias, sends that path to the package. The package has a file at each of these paths, and each file loads only its own module of `@rootnative/web`.

These imports load the root of the package, and with it all of `@rootnative/web`:

- A namespace import, such as `import * as RN from 'react-native'`, or a default import.
- A name that react-native-web doesn't have, such as `useAnimatedValue`.
- `require('react-native')`.

Expo Router uses `require('react-native')`. So with Expo Router, the bundle has all of `@rootnative/web`, also the components that your app doesn't use.

Expo also calls `AppRegistry` from `react-native-web` to start the app, and asks it for the reset styles of the page. The package gives both: your app renders with React DOM, and `body` gets no margin, as with react-native-web.

Expo's libraries import `UIManager`, `NativeModules`, `LogBox`, `DeviceEventEmitter`, `NativeEventEmitter`, and `AssetRegistry` on the web too. The package gives them as react-native-web does: `NativeModules` has no native module, `LogBox` does nothing, `UIManager` measures an element with the host methods of `@rootnative/web`, only JavaScript emits events on the two emitters, and `AssetRegistry` is the asset registry of `@rootnative/web`.

## What works

| Part                         | Behavior                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Components and APIs          | Each one that `@rootnative/web` has. See [Status](/status).                                                                                      |
| Expo Router                  | Tabs, a stack, links, the back button, and a URL that opens a screen directly.                                                                   |
| The dev server               | Works.                                                                                                                                           |
| `expo export --platform web` | Works with `web.output: 'single'`, the default, and with `'static'`: Expo Router renders each route on the server, and the page hydrates.        |
| Reanimated 4                 | Animates the components. Expo's Babel preset runs the Worklets plugin, so the app needs no setup.                                                |
| Image imports                | `require('./logo.png')` loads the image. On the web, Expo gives the import a `uri`, a `width`, and a `height`, and [`Image`](/image) reads them. |
| `react-native-svg`           | Renders. The package has the assets registry that it loads on the web.                                                                           |

## Names that aren't there yet

A name of `react-native` that `@rootnative/web` doesn't have yet loads as a stub. The import works, so a library that imports the name and doesn't use it still loads. A use throws an error that names it, such as `ImageBackground is not in @rootnative/web yet`.

The largest ones today are `ImageBackground` and `SafeAreaView`. The file `expo-exports.json` of the package lists all of them under `missing`: `node_modules/@rootnative/web-expo/expo-exports.json`, or `node_modules/react-native-web/expo-exports.json` with the alias.
