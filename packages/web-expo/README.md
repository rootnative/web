# @rootnative/web-expo

Runs an Expo app on [`@rootnative/web`](https://rootnative.github.io/web/) in place of react-native-web.

Expo's web bundler rewrites each `react-native` import to a file of react-native-web. This package has the same file layout, and each file loads `@rootnative/web`.

## Install

Install this package, and remove react-native-web:

```sh
npm install @rootnative/web-expo
npm uninstall react-native-web
```

Wrap your Metro config with `withRootNative`. On the web, it sends each import of `react-native` and of react-native-web to this package:

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config')
const { withRootNative } = require('@rootnative/web-expo/metro.cjs')

module.exports = withRootNative(getDefaultConfig(__dirname))
```

Expo then warns that react-native-web isn't installed. The warning doesn't stop the dev server or `expo export`.

Or, with no Metro config, install this package under the name `react-native-web`:

```json
{
  "dependencies": {
    "react-native-web": "npm:@rootnative/web-expo@0.0.2"
  }
}
```

This package depends on the same version of `@rootnative/web`, and works only with that version. Don't add a different version of `@rootnative/web` to your app.

## What works

An Expo app, also with Expo Router, on the dev server and in a web export (`expo export --platform web`) with `web.output: 'single'` or `'static'`. Reanimated 4 animates the components, image imports load, and `react-native-svg` renders.

The names of React Native that `@rootnative/web` doesn't have yet load as stubs, and a stub throws when your code uses it. `expo-exports.json` lists them under `missing`.
